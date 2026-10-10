export type DayStatus = "past" | "unavailable" | "closed" | "blocked" | "booked" | "limited" | "available";

export type BusyRange = { start: string; end: string; kind: "booked" | "blocked" };

export type AvailabilityDay = {
  date: string; // yyyy-MM-dd in the business time zone
  status: DayStatus;
  open: string | null;
  close: string | null;
  busy: BusyRange[];
};

export type AvailabilityResponse = {
  timezone: string;
  today: string;
  last_bookable_date: string;
  min_notice_hours: number;
  buffer_minutes: number;
  days: AvailabilityDay[];
};
