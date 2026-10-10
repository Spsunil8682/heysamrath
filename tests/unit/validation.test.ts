import { describe, expect, it } from "vitest";
import { mapDbError } from "@/lib/booking/errors";
import { blockSchema, portfolioSchema, settingsSchema } from "@/lib/validation/admin";
import { bookingRequestSchema } from "@/lib/validation/booking";

const validBooking = {
  customerName: "  Asha Verma ",
  phone: "+91 98765 43210",
  email: "Asha@Example.com ",
  serviceId: "3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
  eventDate: "2030-05-10",
  startTime: "10:00",
  location: "Udaipur",
  consent: true,
};

describe("booking request schema", () => {
  it("accepts and normalises valid input", () => {
    const r = bookingRequestSchema.parse(validBooking);
    expect(r.customerName).toBe("Asha Verma");
    expect(r.email).toBe("asha@example.com");
  });

  it.each([
    ["missing consent", { consent: false }],
    ["bad email", { email: "asha@" }],
    ["bad phone", { phone: "call me maybe" }],
    ["short name", { customerName: "A" }],
    ["no service", { serviceId: "" }],
    ["bad date", { eventDate: "10/05/2030" }],
    ["bad time", { startTime: "25:00" }],
    ["end without start", { startTime: "", endTime: "12:00" }],
    ["honeypot filled", { website: "http://spam" }],
    ["oversized notes", { requirements: "x".repeat(4001) }],
  ])("rejects %s", (_label, patch) => {
    expect(bookingRequestSchema.safeParse({ ...validBooking, ...patch }).success).toBe(false);
  });

  it("strips control characters", () => {
    const r = bookingRequestSchema.parse({ ...validBooking, location: "Udai\u0000pur\u0007" });
    expect(r.location).toBe("Udaipur");
  });
});

describe("admin schemas", () => {
  it("requires a poster for videos and rejects foreign media hosts", () => {
    const base = { title: "T", category: "events", mediaType: "video", mediaUrl: "/media/videos/a.mp4", displayOrder: "1" };
    expect(portfolioSchema.safeParse(base).success).toBe(false);
    expect(portfolioSchema.safeParse({ ...base, thumbnailUrl: "/media/thumbnails/a.jpg" }).success).toBe(true);
    expect(portfolioSchema.safeParse({ ...base, thumbnailUrl: "/media/thumbnails/a.jpg", mediaUrl: "https://evil.example/a.mp4" }).success).toBe(false);
  });

  it("validates blocks", () => {
    expect(blockSchema.safeParse({ startDate: "2030-01-02", endDate: "2030-01-01" }).success).toBe(false);
    expect(blockSchema.safeParse({ startDate: "2030-01-01", endDate: "2030-01-02", startTime: "10:00", endTime: "12:00" }).success).toBe(false);
    expect(blockSchema.safeParse({ startDate: "2030-01-01", endDate: "2030-01-01", startTime: "12:00", endTime: "10:00" }).success).toBe(false);
    expect(blockSchema.safeParse({ startDate: "2030-01-01", endDate: "2030-01-01", startTime: "10:00", endTime: "12:00" }).success).toBe(true);
  });

  it("validates settings time zone and hours", () => {
    const hours = Object.fromEntries(["1", "2", "3", "4", "5", "6", "7"].map((d) => [d, { closed: "", open: "09:00", close: "18:00" }]));
    const base = {
      businessName: "Hey Samrath", phone: "", email: "", whatsapp: "", timezone: "Asia/Kolkata", currency: "inr",
      bufferMinutes: "30", minNoticeHours: "24", maxAdvanceDays: "365", maxBookingsPerDay: "2", hours,
    };
    expect(settingsSchema.parse(base).currency).toBe("INR");
    expect(settingsSchema.safeParse({ ...base, timezone: "Mars/Base" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...base, hours: { ...hours, "1": { closed: "", open: "18:00", close: "09:00" } } }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...base, hours: { ...hours, "1": { closed: "on", open: "", close: "" } } }).success).toBe(true);
    expect(settingsSchema.safeParse({ ...base, instagram: "http://insecure.example" }).success).toBe(false);
  });
});

describe("database error mapping", () => {
  it("maps known codes and never leaks unknown database messages", () => {
    expect(mapDbError({ message: "SLOT_CONFLICT", hint: "Overlaps BK-123", details: "BK-123" }).message).toBe("Overlaps BK-123");
    expect(mapDbError({ message: "SLOT_CONFLICT", details: "BK-123" }).detail).toBeUndefined();
    expect(mapDbError({ code: "23P01", message: "conflicting key value violates exclusion constraint" }).code).toBe("SLOT_CONFLICT");
    const unknown = mapDbError({ code: "XX000", message: 'relation "secret_table" does not exist' });
    expect(unknown.code).toBe("UNKNOWN");
    expect(unknown.message).not.toContain("secret_table");
  });
});
