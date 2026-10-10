import { TZDate } from "@date-fns/tz";
import { addDays, addHours, endOfMonth, format, startOfMonth, startOfWeek } from "date-fns";

/** Today's date (yyyy-MM-dd) in the business time zone. */
export function todayIn(timeZone: string): string {
  return format(TZDate.tz(timeZone), "yyyy-MM-dd");
}

/** "yyyy-MM-dd HH:mm" in the business time zone, `hours` from now. DST-aware via TZDate. */
export function localNowPlus(timeZone: string, hours: number): string {
  return format(addHours(TZDate.tz(timeZone), hours), "yyyy-MM-dd HH:mm");
}

/** "yyyy-MM" → 6×7 grid of yyyy-MM-dd strings (Monday-first), plus the month's first/last day. */
export function monthGrid(month: string) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1, 12);
  const gridStart = startOfWeek(startOfMonth(first), { weekStartsOn: 1 });
  const days = Array.from({ length: 42 }, (_, i) => format(addDays(gridStart, i), "yyyy-MM-dd"));
  return {
    days,
    firstOfMonth: format(startOfMonth(first), "yyyy-MM-dd"),
    lastOfMonth: format(endOfMonth(first), "yyyy-MM-dd"),
  };
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  return format(new Date(y, m - 1 + delta, 1, 12), "yyyy-MM");
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return format(new Date(y, m - 1, 1, 12), "MMMM yyyy");
}
