import { beforeEach, describe, expect, it } from "vitest";
import { asRole, createTestDb, createUser, type Db } from "./harness";

let db: Db;
let adminId: string;
let customerId: string;

beforeEach(async () => {
  db = await createTestDb();
  adminId = await createUser(db, "owner@example.test", true);
  customerId = await createUser(db, "someone@example.test");
});

async function futureDate(days: number): Promise<string> {
  const { rows } = await db.query<{ d: string }>(
    `select ((now() at time zone 'Asia/Kolkata')::date + $1::int)::text as d`,
    [days],
  );
  return rows[0].d;
}

async function serviceId(slug: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(`select id from public.services where slug = $1`, [slug]);
  return rows[0].id;
}

type RequestInput = {
  name?: string;
  phone?: string;
  email?: string;
  service?: string;
  date: string;
  start?: string | null;
  end?: string | null;
  consent?: boolean;
};

/** Submits a booking request exactly as the public website does: as `anon`, through the RPC. */
async function request(input: RequestInput) {
  const sid = await serviceId(input.service ?? "events");
  return asRole(db, { role: "anon" }, async (tx) => {
    const { rows } = await tx.query<{ r: { booking_reference: string } }>(
      `select public.create_booking_request($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) as r`,
      [
        input.name ?? "Test Customer",
        input.phone ?? "+91 98765 43210",
        input.email ?? `c${Math.random().toString(36).slice(2)}@example.test`,
        sid,
        input.date,
        input.start === undefined ? "10:00" : input.start,
        input.end === undefined ? null : input.end,
        "Udaipur",
        null,
        null,
        input.consent ?? true,
      ],
    );
    return rows[0].r;
  });
}

async function setStatus(reference: string, status: string) {
  return asRole(db, { role: "authenticated", userId: adminId }, (tx) =>
    tx.query(`update public.bookings set status = $1 where booking_reference = $2`, [status, reference]),
  );
}

describe("booking requests (public RPC)", () => {
  it("creates a pending booking with a reference", async () => {
    const date = await futureDate(10);
    const r = await request({ date, start: "10:00" });
    expect(r.booking_reference).toMatch(/^BK-[2-9A-HJKMNP-Z]{8}$/);
    const { rows } = await db.query<{ status: string; end_time: string; occupied: string | null }>(
      `select status, end_time::text, occupied::text from public.bookings where booking_reference = $1`,
      [r.booking_reference],
    );
    expect(rows[0].status).toBe("pending");
    expect(rows[0].end_time).toBe("14:00:00"); // events service: 240 minutes
    expect(rows[0].occupied).toBeNull(); // pending never occupies the calendar
  });

  it("rejects past dates", async () => {
    await expect(request({ date: await futureDate(-1) })).rejects.toThrow("DATE_IN_PAST");
  });

  it("rejects requests inside the minimum notice period", async () => {
    await db.exec(`update public.business_settings set min_notice_hours = 72`);
    await expect(request({ date: await futureDate(1) })).rejects.toThrow("NOTICE_TOO_SHORT");
  });

  it("rejects dates beyond the advance window", async () => {
    await db.exec(`update public.business_settings set max_advance_days = 30`);
    await expect(request({ date: await futureDate(31) })).rejects.toThrow("DATE_TOO_FAR");
  });

  it("requires consent", async () => {
    await expect(request({ date: await futureDate(10), consent: false })).rejects.toThrow("CONSENT_REQUIRED");
  });

  it("rejects inactive services", async () => {
    await db.exec(`update public.services set active = false where slug = 'events'`);
    await expect(request({ date: await futureDate(10) })).rejects.toThrow("SERVICE_UNAVAILABLE");
  });

  it("enforces working hours and closed days", async () => {
    const date = await futureDate(10);
    await expect(request({ date, start: "19:00" })).rejects.toThrow("OUTSIDE_HOURS"); // 19:00 + 4h > 21:00
    await expect(request({ date, start: "07:00" })).rejects.toThrow("OUTSIDE_HOURS");
    const { rows } = await db.query<{ dow: number }>(`select extract(isodow from $1::date)::int as dow`, [date]);
    await db.query(
      `update public.business_settings set business_hours = jsonb_set(business_hours, array[$1::text], 'null'::jsonb)`,
      [String(rows[0].dow)],
    );
    await expect(request({ date })).rejects.toThrow("CLOSED_DAY");
  });

  it("validates input through table constraints", async () => {
    const date = await futureDate(10);
    await expect(request({ date, email: "not-an-email" })).rejects.toThrow(/check constraint/);
    await expect(request({ date, phone: "call me" })).rejects.toThrow(/check constraint/);
    await expect(request({ date, name: "x" })).rejects.toThrow(/check constraint/);
  });

  it("requires a start time for timed services and ignores times for full-day services", async () => {
    const date = await futureDate(10);
    await expect(request({ date, start: null })).rejects.toThrow("START_TIME_REQUIRED");
    const r = await request({ date, service: "wedding", start: null });
    const { rows } = await db.query<{ start_time: string | null; hours: number }>(
      `select start_time, extract(epoch from ends_at - starts_at) / 3600 as hours from public.bookings where booking_reference = $1`,
      [r.booking_reference],
    );
    expect(rows[0].start_time).toBeNull();
    expect(Number(rows[0].hours)).toBe(24);
  });

  it("rejects duplicate pending requests from the same customer", async () => {
    const date = await futureDate(10);
    await request({ date, email: "dup@example.test" });
    await expect(request({ date, email: "DUP@example.test" })).rejects.toThrow("DUPLICATE_REQUEST");
  });

  it("rate-limits repeated submissions from one contact", async () => {
    for (let i = 0; i < 3; i++) {
      await request({ date: await futureDate(10 + i), email: "spam@example.test" });
    }
    await expect(request({ date: await futureDate(20), email: "spam@example.test" })).rejects.toThrow("RATE_LIMITED");
  });

  it("rejects requests on blocked dates", async () => {
    const date = await futureDate(12);
    await asRole(db, { role: "authenticated", userId: adminId }, (tx) =>
      tx.query(`insert into public.availability_blocks (start_date, end_date, reason) values ($1, $1, 'Holiday')`, [date]),
    );
    await expect(request({ date })).rejects.toThrow("SLOT_BLOCKED");
  });

  it("does not reveal the full-day status of other customers' pending requests", async () => {
    const date = await futureDate(10);
    await request({ date, start: "10:00" });
    // Pending requests do not block: a second customer may request the same slot.
    await expect(request({ date, start: "10:00" })).resolves.toBeTruthy();
  });
});

describe("conflict prevention", () => {
  it("rejects public requests that overlap a confirmed booking (incl. buffer)", async () => {
    const date = await futureDate(10);
    const a = await request({ date, start: "10:00" }); // 10:00-14:00, +60m buffer => 15:00
    await setStatus(a.booking_reference, "confirmed");
    await expect(request({ date, start: "14:30" })).rejects.toThrow("SLOT_UNAVAILABLE");
    await expect(request({ date, start: "15:00", end: "17:00" })).resolves.toBeTruthy();
  });

  it("re-checks availability when the admin confirms; second overlapping confirmation fails", async () => {
    const date = await futureDate(10);
    const a = await request({ date, start: "10:00" });
    const b = await request({ date, start: "11:00" });
    await setStatus(a.booking_reference, "confirmed");
    await expect(setStatus(b.booking_reference, "confirmed")).rejects.toThrow("SLOT_CONFLICT");
    const { rows } = await db.query<{ status: string }>(
      `select status from public.bookings where booking_reference = $1`,
      [b.booking_reference],
    );
    expect(rows[0].status).toBe("pending");
  });

  it("enforces the bookings-per-day limit", async () => {
    await db.exec(`update public.business_settings set allow_multiple_per_day = false`);
    const date = await futureDate(10);
    const a = await request({ date, start: "09:00", end: "10:00" });
    const b = await request({ date, start: "16:00", end: "17:00" });
    await setStatus(a.booking_reference, "confirmed");
    await expect(setStatus(b.booking_reference, "confirmed")).rejects.toThrow("DAY_FULL");
    await expect(request({ date, start: "18:00", end: "19:00" })).rejects.toThrow("DAY_FULL");
  });

  it("a confirmed full-day booking fills the date", async () => {
    const date = await futureDate(10);
    const w = await request({ date, service: "wedding", start: null });
    await setStatus(w.booking_reference, "confirmed");
    await expect(request({ date, start: "10:00" })).rejects.toThrow("SLOT_UNAVAILABLE");
  });

  it("services that do not block the calendar never conflict", async () => {
    const date = await futureDate(10);
    const w = await request({ date, service: "wedding", start: null });
    await setStatus(w.booking_reference, "confirmed");
    const e = await request({ date, service: "video-editing", start: "10:00" });
    await expect(setStatus(e.booking_reference, "confirmed")).resolves.toBeTruthy();
  });

  it("refuses to confirm onto a blocked range", async () => {
    const date = await futureDate(10);
    const a = await request({ date, start: "10:00" });
    await asRole(db, { role: "authenticated", userId: adminId }, (tx) =>
      tx.query(
        `insert into public.availability_blocks (start_date, end_date, start_time, end_time) values ($1, $1, '12:00', '13:00')`,
        [date],
      ),
    );
    await expect(setStatus(a.booking_reference, "confirmed")).rejects.toThrow("SLOT_BLOCKED");
  });

  it("refuses blocks that would swallow a confirmed booking", async () => {
    const date = await futureDate(10);
    const a = await request({ date, start: "10:00" });
    await setStatus(a.booking_reference, "confirmed");
    await expect(
      asRole(db, { role: "authenticated", userId: adminId }, (tx) =>
        tx.query(`insert into public.availability_blocks (start_date, end_date) values ($1, $1)`, [date]),
      ),
    ).rejects.toThrow("BLOCK_CONFLICTS_BOOKING");
  });

  it("re-checks when a confirmed booking is moved onto another", async () => {
    const date = await futureDate(10);
    const a = await request({ date, start: "09:00", end: "10:00" });
    const b = await request({ date, start: "16:00", end: "17:00" });
    await setStatus(a.booking_reference, "confirmed");
    await setStatus(b.booking_reference, "confirmed");
    await expect(
      asRole(db, { role: "authenticated", userId: adminId }, (tx) =>
        tx.query(`update public.bookings set start_time = '09:30', end_time = '10:30' where booking_reference = $1`, [
          b.booking_reference,
        ]),
      ),
    ).rejects.toThrow("SLOT_CONFLICT");
  });

  it("the exclusion constraint blocks overlaps even if every trigger check is bypassed", async () => {
    // Simulates two transactions that both passed the application checks before either committed.
    const date = await futureDate(10);
    const a = await request({ date, start: "10:00" });
    const b = await request({ date, start: "11:00" });
    await db.exec(`alter table public.bookings disable trigger bookings_guard`);
    await db.query(
      `update public.bookings set status = 'confirmed', occupied = tstzrange(starts_at, ends_at) where booking_reference = $1`,
      [a.booking_reference],
    );
    await expect(
      db.query(
        `update public.bookings set status = 'confirmed', occupied = tstzrange(starts_at, ends_at) where booking_reference = $1`,
        [b.booking_reference],
      ),
    ).rejects.toThrow(/bookings_no_overlap/);
  });

  it("cancelling frees the slot", async () => {
    const date = await futureDate(10);
    const a = await request({ date, start: "10:00" });
    await setStatus(a.booking_reference, "confirmed");
    await setStatus(a.booking_reference, "cancelled");
    await expect(request({ date, start: "10:00" })).resolves.toBeTruthy();
  });
});

describe("status machine & audit", () => {
  it("rejects invalid transitions and records timestamps/events", async () => {
    const date = await futureDate(10);
    const a = await request({ date });
    await setStatus(a.booking_reference, "rejected");
    await expect(setStatus(a.booking_reference, "confirmed")).rejects.toThrow("INVALID_STATUS_TRANSITION");
    await expect(setStatus(a.booking_reference, "completed")).rejects.toThrow("INVALID_STATUS_TRANSITION");
    const { rows } = await db.query<{ rejected_at: string | null; n: number }>(
      `select b.rejected_at, (select count(*)::int from public.booking_events e where e.booking_id = b.id) as n
       from public.bookings b where booking_reference = $1`,
      [a.booking_reference],
    );
    expect(rows[0].rejected_at).not.toBeNull();
    expect(rows[0].n).toBe(2); // created + status_changed
  });

  it("cannot complete an event that has not started", async () => {
    const a = await request({ date: await futureDate(10) });
    await setStatus(a.booking_reference, "confirmed");
    await expect(setStatus(a.booking_reference, "completed")).rejects.toThrow("EVENT_NOT_STARTED");
  });

  it("keeps the booking reference immutable", async () => {
    const a = await request({ date: await futureDate(10) });
    await asRole(db, { role: "authenticated", userId: adminId }, (tx) =>
      tx.query(`update public.bookings set booking_reference = 'HACKED' where booking_reference = $1`, [a.booking_reference]),
    );
    const { rows } = await db.query(`select 1 from public.bookings where booking_reference = $1`, [a.booking_reference]);
    expect(rows).toHaveLength(1);
  });
});

describe("row level security", () => {
  it("public can read active services and published portfolio only", async () => {
    await db.exec(`update public.services set active = false where slug = 'model-reels'`);
    await db.exec(`
      insert into public.portfolio_items (title, category, media_type, media_url, thumbnail_url, published) values
        ('Draft', 'events', 'video', '/media/videos/dj-night.mp4', '/media/thumbnails/dj-night.jpg', false),
        ('A', 'events', 'image', '/media/images/a.jpg', null, true),
        ('B', 'events', 'image', '/media/images/b.jpg', null, true),
        ('C', 'events', 'image', '/media/images/c.jpg', null, true)`);
    const result = await asRole(db, { role: "anon" }, async (tx) => ({
      services: (await tx.query<{ slug: string }>(`select slug from public.services`)).rows.map((r) => r.slug),
      portfolio: (await tx.query<{ media_url: string }>(`select media_url from public.portfolio_items`)).rows.map(
        (r) => r.media_url,
      ),
    }));
    expect(result.services).not.toContain("model-reels");
    expect(result.services.length).toBe(6);
    expect(result.portfolio).not.toContain("/media/videos/dj-night.mp4");
    expect(result.portfolio.length).toBe(3);
  });

  it("public cannot read or write bookings, blocks, messages or events", async () => {
    await request({ date: await futureDate(10) });
    for (const sql of [
      `select * from public.bookings`,
      `select admin_notes from public.bookings`,
      `update public.bookings set status = 'confirmed'`,
      `insert into public.bookings (customer_name) values ('x')`,
      `select * from public.availability_blocks`,
      `select * from public.contact_messages`,
      `select * from public.booking_events`,
      `select * from public.profiles`,
      `update public.services set price = 1`,
      `select public.confirmed_bookings_outside_hours()`,
    ]) {
      await expect(asRole(db, { role: "anon" }, (tx) => tx.query(sql)), sql).rejects.toThrow(/permission denied/);
    }
  });

  it("signed-in non-admins see no bookings and cannot change them", async () => {
    const a = await request({ date: await futureDate(10) });
    const out = await asRole(db, { role: "authenticated", userId: customerId }, async (tx) => {
      const read = await tx.query(`select * from public.bookings`);
      const upd = await tx.query(`update public.bookings set status = 'confirmed' where booking_reference = $1`, [
        a.booking_reference,
      ]);
      const svc = await tx.query(`update public.services set price = 1`);
      return { read: read.rows.length, upd: upd.affectedRows, svc: svc.affectedRows };
    });
    expect(out).toEqual({ read: 0, upd: 0, svc: 0 });
    await expect(
      asRole(db, { role: "authenticated", userId: customerId }, (tx) =>
        tx.query(`select public.confirmed_bookings_outside_hours()`),
      ),
    ).rejects.toThrow("FORBIDDEN");
  });

  it("users cannot promote themselves to admin", async () => {
    await expect(
      asRole(db, { role: "authenticated", userId: customerId }, (tx) =>
        tx.query(`update public.profiles set role = 'admin' where id = $1`, [customerId]),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asRole(db, { role: "authenticated", userId: customerId }, (tx) =>
        tx.query(`insert into public.profiles (id, role) values (gen_random_uuid(), 'admin')`),
      ),
    ).rejects.toThrow(/permission denied/);
    const { rows } = await db.query<{ role: string }>(`select role from public.profiles where id = $1`, [customerId]);
    expect(rows[0].role).toBe("customer");
  });

  it("admins can read bookings including notes", async () => {
    const a = await request({ date: await futureDate(10) });
    const rows = await asRole(db, { role: "authenticated", userId: adminId }, async (tx) => {
      await tx.query(`update public.bookings set admin_notes = 'VIP' where booking_reference = $1`, [a.booking_reference]);
      return (await tx.query<{ admin_notes: string }>(`select admin_notes from public.bookings`)).rows;
    });
    expect(rows).toEqual([{ admin_notes: "VIP" }]);
  });
});

describe("availability RPC", () => {
  it("reports statuses without exposing customer data", async () => {
    const d1 = await futureDate(10);
    const d2 = await futureDate(11);
    const d3 = await futureDate(12);
    const a = await request({ date: d1, start: "10:00", name: "Secret Person" });
    await setStatus(a.booking_reference, "confirmed");
    await asRole(db, { role: "authenticated", userId: adminId }, (tx) =>
      tx.query(`insert into public.availability_blocks (start_date, end_date, reason) values ($1, $1, 'private reason')`, [
        d2,
      ]),
    );
    const yesterday = await futureDate(-1);
    const res = await asRole(db, { role: "anon" }, async (tx) => {
      const { rows } = await tx.query<{ r: unknown }>(`select public.get_availability($1, $2) as r`, [yesterday, d3]);
      return rows[0].r as { days: { date: string; status: string; busy: { start: string; end: string }[] }[] };
    });
    const json = JSON.stringify(res);
    expect(json).not.toContain("Secret Person");
    expect(json).not.toContain("private reason");
    expect(json).not.toContain(a.booking_reference);
    const byDate = Object.fromEntries(res.days.map((d) => [d.date, d]));
    expect(byDate[yesterday].status).toBe("past");
    expect(byDate[d1].status).toBe("limited");
    expect(byDate[d1].busy[0]).toMatchObject({ start: "10:00", end: "15:00" });
    expect(byDate[d2].status).toBe("blocked");
    expect(byDate[d3].status).toBe("available");
  });

  it("limits the requested range", async () => {
    const [from, to] = [await futureDate(0), await futureDate(90)];
    await expect(
      asRole(db, { role: "anon" }, (tx) => tx.query(`select public.get_availability($1, $2)`, [from, to])),
    ).rejects.toThrow("INVALID_RANGE");
  });
});

describe("settings & media guards", () => {
  it("rejects media URLs outside /media/ or Cloudinary", async () => {
    const insert = (url: string) =>
      asRole(db, { role: "authenticated", userId: adminId }, (tx) =>
        tx.query(
          `insert into public.portfolio_items (title, category, media_type, media_url) values ('t', 'photography', 'image', $1)`,
          [url],
        ),
      );
    for (const bad of ["javascript:alert(1)", "https://evil.example/x.jpg", "/media/../../etc/passwd", "http://res.cloudinary.com/x/image/upload/a.jpg"]) {
      await expect(insert(bad), bad).rejects.toThrow(/check constraint/);
    }
    await expect(insert("/media/images/ok.jpg")).resolves.toBeTruthy();
    await expect(insert("https://res.cloudinary.com/demo/image/upload/v1712345/folder/photo.jpg")).resolves.toBeTruthy();
  });

  it("requires a poster for videos", async () => {
    await expect(
      db.query(
        `insert into public.portfolio_items (title, category, media_type, media_url) values ('t', 'events', 'video', '/media/videos/a.mp4')`,
      ),
    ).rejects.toThrow(/portfolio_video_needs_thumbnail/);
  });

  it("locks the time zone while upcoming bookings exist", async () => {
    await request({ date: await futureDate(10) });
    await expect(
      asRole(db, { role: "authenticated", userId: adminId }, (tx) =>
        tx.query(`update public.business_settings set timezone = 'Europe/London'`),
      ),
    ).rejects.toThrow("TIMEZONE_LOCKED");
    await expect(db.query(`update public.business_settings set timezone = 'Mars/Base'`)).rejects.toThrow(
      "INVALID_TIMEZONE",
    );
  });

  it("refuses to lower the per-day limit below existing confirmed bookings", async () => {
    const date = await futureDate(10);
    const a = await request({ date, start: "09:00", end: "10:00" });
    const b = await request({ date, start: "16:00", end: "17:00" });
    await setStatus(a.booking_reference, "confirmed");
    await setStatus(b.booking_reference, "confirmed");
    await expect(
      asRole(db, { role: "authenticated", userId: adminId }, (tx) =>
        tx.query(`update public.business_settings set allow_multiple_per_day = false`),
      ),
    ).rejects.toThrow("LIMIT_CONFLICT");
  });

  it("reports confirmed bookings outside new working hours instead of dropping them", async () => {
    const date = await futureDate(10);
    const a = await request({ date, start: "18:00", end: "20:00" });
    await setStatus(a.booking_reference, "confirmed");
    const rows = await asRole(db, { role: "authenticated", userId: adminId }, async (tx) => {
      await tx.query(
        `update public.business_settings set business_hours = '{"1":{"open":"09:00","close":"17:00"},"2":{"open":"09:00","close":"17:00"},"3":{"open":"09:00","close":"17:00"},"4":{"open":"09:00","close":"17:00"},"5":{"open":"09:00","close":"17:00"},"6":{"open":"09:00","close":"17:00"},"7":{"open":"09:00","close":"17:00"}}'`,
      );
      return (await tx.query<{ booking_reference: string }>(`select * from public.confirmed_bookings_outside_hours()`)).rows;
    });
    expect(rows.map((r) => r.booking_reference)).toEqual([a.booking_reference]);
  });

  it("contact messages are stored via RPC and rate limited", async () => {
    const send = () =>
      asRole(db, { role: "anon" }, (tx) =>
        tx.query(`select public.submit_contact_message('Asha', 'asha@example.test', null, 'Hello, I would like a quote.')`),
      );
    await send();
    await send();
    await send();
    await expect(send()).rejects.toThrow("RATE_LIMITED");
  });
});
