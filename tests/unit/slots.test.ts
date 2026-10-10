import { describe, expect, it } from "vitest";
import { startTimeSlots } from "@/lib/booking/slots";
import type { AvailabilityDay } from "@/lib/types/availability";

const day = (over: Partial<AvailabilityDay> = {}): AvailabilityDay => ({
  date: "2030-05-10",
  status: "available",
  open: "09:00",
  close: "18:00",
  busy: [],
  ...over,
});

describe("startTimeSlots", () => {
  it("offers starts that fit inside working hours", () => {
    const slots = startTimeSlots(day(), 120, 60, "2030-01-01 00:00");
    expect(slots[0].time).toBe("09:00");
    expect(slots.at(-1)!.time).toBe("16:00"); // 16:00 + 2h = 18:00
    expect(slots.every((s) => s.available)).toBe(true);
  });

  it("respects existing busy ranges (which already include their buffer) and our own buffer", () => {
    const slots = startTimeSlots(day({ status: "limited", busy: [{ start: "12:00", end: "14:00", kind: "booked" }] }), 60, 60, "2030-01-01 00:00");
    const free = slots.filter((s) => s.available).map((s) => s.time);
    expect(free).toContain("10:00"); // 10:00-11:00 +60 buffer = 12:00, touches but doesn't overlap
    expect(free).not.toContain("10:30");
    expect(free).not.toContain("13:30");
    expect(free).toContain("14:00");
  });

  it("marks times inside the minimum notice window unavailable", () => {
    const slots = startTimeSlots(day(), 60, 0, "2030-05-10 12:00");
    expect(slots.find((s) => s.time === "11:30")!.available).toBe(false);
    expect(slots.find((s) => s.time === "12:00")!.available).toBe(true);
  });

  it("returns nothing for closed, blocked or booked days", () => {
    for (const status of ["closed", "blocked", "booked", "past"] as const) {
      expect(startTimeSlots(day({ status }), 60, 0, "2030-01-01 00:00")).toEqual([]);
    }
  });
});
