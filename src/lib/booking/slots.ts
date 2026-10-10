import type { AvailabilityDay } from "@/lib/types/availability";

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
export const fromMinutes = (mins: number) =>
  `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

export type Slot = { time: string; available: boolean };

/**
 * Suggests start times for a timed service on one day. This only guides the visitor; the database
 * re-validates every request (working hours, blocks, buffers, conflicts) when it is submitted.
 *
 * @param earliestLocal "yyyy-MM-dd HH:mm" in the business time zone (now + minimum notice)
 */
export function startTimeSlots(
  day: AvailabilityDay,
  durationMinutes: number,
  bufferMinutes: number,
  earliestLocal: string,
  stepMinutes = 30,
): Slot[] {
  if (!day.open || !day.close || !["available", "limited"].includes(day.status)) return [];
  const open = toMinutes(day.open);
  const close = toMinutes(day.close);
  const busy = day.busy.map((b) => [toMinutes(b.start), b.end === "24:00" ? 1440 : toMinutes(b.end)] as const);
  const slots: Slot[] = [];
  for (let start = open; start + durationMinutes <= close; start += stepMinutes) {
    const time = fromMinutes(start);
    const occupiedEnd = start + durationMinutes + bufferMinutes;
    const overlaps = busy.some(([bs, be]) => start < be && bs < occupiedEnd);
    const tooSoon = `${day.date} ${time}` < earliestLocal;
    slots.push({ time, available: !overlaps && !tooSoon });
  }
  return slots;
}

export const BOOKABLE_STATUSES = new Set(["available", "limited"]);
