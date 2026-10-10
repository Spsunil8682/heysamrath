/**
 * Real multi-connection PostgreSQL (embedded-postgres) to prove that simultaneous confirmations
 * cannot double-book. PGlite (used by booking.test.ts) has a single connection and cannot interleave
 * transactions, so this suite starts a real server in a temp directory.
 */
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const dataDir = mkdtempSync(join(tmpdir(), "frame-studio-pg-"));
const port = 54_000 + Math.floor(Math.random() * 1000);
const server = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "postgres",
  password: "postgres",
  port,
  persistent: false,
  onLog: () => {},
});

let adminId: string;
const clients: Client[] = [];

async function connect(): Promise<Client> {
  const c = new Client({ host: "localhost", port, user: "postgres", password: "postgres", database: "booking_test" });
  await c.connect();
  clients.push(c);
  return c;
}

/** Opens a transaction acting as the admin through the API role (RLS + triggers apply). */
async function adminTx(): Promise<Client> {
  const c = await connect();
  await c.query("begin");
  await c.query("set local role authenticated");
  await c.query("select set_config('request.jwt.claim.sub', $1, true)", [adminId]);
  return c;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Resolves to "pending" if the promise has not settled within `ms` (i.e. it is blocked on a lock). */
async function stateAfter(p: Promise<unknown>, ms: number) {
  return Promise.race([p.then(() => "resolved", () => "rejected"), sleep(ms).then(() => "pending")]);
}

let setup: Client;

beforeAll(async () => {
  await server.initialise();
  await server.start();
  await server.createDatabase("booking_test");
  setup = await connect();
  await setup.query(readFileSync(join(__dirname, "supabase-stub.sql"), "utf8"));
  const dir = join(root, "supabase", "migrations");
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
    await setup.query(readFileSync(join(dir, f), "utf8"));
  }
  await setup.query(readFileSync(join(root, "supabase", "seed.sql"), "utf8"));
  const u = await setup.query<{ id: string }>(`insert into auth.users (email) values ('owner@example.test') returning id`);
  adminId = u.rows[0].id;
  await setup.query(`update public.profiles set role = 'admin' where id = $1`, [adminId]);
}, 180_000);

afterAll(async () => {
  for (const c of clients) await c.end().catch(() => {});
  await server.stop().catch(() => {});
  rmSync(dataDir, { recursive: true, force: true });
});

async function pendingPair(daysAhead: number, startA: string, startB: string) {
  const make = async (start: string) => {
    const r = await setup.query<{ r: { booking_reference: string } }>(
      `select public.create_booking_request('Customer', $4, $1,
         (select id from public.services where slug = 'events'),
         (now() at time zone 'Asia/Kolkata')::date + $2::int, $3::time, null, 'Jaipur', null, null, true) as r`,
      [
        `c${Math.random().toString(36).slice(2)}@example.test`,
        daysAhead,
        start,
        `+91 9${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`,
      ],
    );
    return r.rows[0].r.booking_reference;
  };
  return [await make(startA), await make(startB)] as const;
}

describe("concurrent confirmations (real PostgreSQL)", () => {
  it("two admins confirming overlapping requests at the same time: exactly one wins", async () => {
    const [refA, refB] = await pendingPair(20, "10:00", "11:00");
    const t1 = await adminTx();
    const t2 = await adminTx();

    await t1.query(`update public.bookings set status = 'confirmed' where booking_reference = $1`, [refA]);
    // t2 must wait for t1's calendar lock rather than reading a stale snapshot.
    const second = t2.query(`update public.bookings set status = 'confirmed' where booking_reference = $1`, [refB]);
    expect(await stateAfter(second, 500)).toBe("pending");

    await t1.query("commit");
    await expect(second).rejects.toThrow("SLOT_CONFLICT");
    await t2.query("rollback");

    const { rows } = await setup.query<{ booking_reference: string; status: string }>(
      `select booking_reference, status from public.bookings where booking_reference in ($1, $2) order by booking_reference`,
      [refA, refB],
    );
    const byRef = Object.fromEntries(rows.map((r) => [r.booking_reference, r.status]));
    expect(byRef[refA]).toBe("confirmed");
    expect(byRef[refB]).toBe("pending");
  });

  it("a block added while a confirmation is in flight cannot hide a conflict", async () => {
    const [refA] = await pendingPair(21, "10:00", "16:00");
    const t1 = await adminTx();
    const t2 = await adminTx();
    await t1.query(`update public.bookings set status = 'confirmed' where booking_reference = $1`, [refA]);
    const block = t2.query(
      `insert into public.availability_blocks (start_date, end_date)
       values ((now() at time zone 'Asia/Kolkata')::date + 21, (now() at time zone 'Asia/Kolkata')::date + 21)`,
    );
    expect(await stateAfter(block, 500)).toBe("pending");
    await t1.query("commit");
    await expect(block).rejects.toThrow("BLOCK_CONFLICTS_BOOKING");
    await t2.query("rollback");
  });

  it("the exclusion constraint alone serialises racing writers (trigger checks disabled)", async () => {
    const [refA, refB] = await pendingPair(22, "10:00", "11:00");
    await setup.query(`alter table public.bookings disable trigger bookings_guard`);
    try {
      const t1 = await connect();
      const t2 = await connect();
      await t1.query("begin");
      await t2.query("begin");
      const sql = `update public.bookings set status = 'confirmed', occupied = tstzrange(starts_at, ends_at)
                   where booking_reference = $1`;
      await t1.query(sql, [refA]);
      const second = t2.query(sql, [refB]);
      expect(await stateAfter(second, 500)).toBe("pending");
      await t1.query("commit");
      await expect(second).rejects.toThrow(/bookings_no_overlap/);
      await t2.query("rollback");
    } finally {
      await setup.query(`alter table public.bookings enable trigger bookings_guard`);
    }
  });
});
