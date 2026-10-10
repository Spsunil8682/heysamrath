/**
 * Maps database error codes (raised by the booking functions/triggers) to safe, user-facing messages.
 * Unknown errors become a generic message so internal details never leak to visitors.
 */
type PgLikeError = { code?: string; message?: string; hint?: string | null; details?: string | null };

export const BOOKING_ERROR_MESSAGES: Record<string, string> = {
  CONSENT_REQUIRED: "Please accept the privacy notice.",
  SERVICE_UNAVAILABLE: "The selected service is not currently available.",
  SERVICE_NOT_FOUND: "The selected service does not exist.",
  RATE_LIMITED: "Too many requests. Please try again later or contact us directly.",
  DATE_IN_PAST: "Please choose a future date.",
  DATE_TOO_FAR: "That date is beyond our booking window.",
  NOTICE_TOO_SHORT: "That time is too soon. Please allow more notice.",
  CLOSED_DAY: "We are not available on that day of the week.",
  OUTSIDE_HOURS: "That time is outside our working hours.",
  START_TIME_REQUIRED: "Please choose a start time.",
  SLOT_BLOCKED: "That date or time is not available.",
  SLOT_UNAVAILABLE: "That time has just been booked. Please choose another time.",
  SLOT_CONFLICT: "This overlaps another confirmed booking.",
  DAY_FULL: "That date is fully booked.",
  DUPLICATE_REQUEST: "You already have a pending request for this service and time.",
  INVALID_STATUS_TRANSITION: "That status change is not allowed.",
  EVENT_NOT_STARTED: "Only events that have started can be marked completed.",
  EVENT_IN_PAST: "Bookings in the past cannot be confirmed or moved.",
  BLOCK_CONFLICTS_BOOKING: "This range overlaps confirmed bookings. Cancel or move them first.",
  TIMEZONE_LOCKED: "The time zone cannot change while upcoming bookings exist.",
  INVALID_TIMEZONE: "Unknown time zone.",
  LIMIT_CONFLICT: "Some upcoming dates already exceed the new per-day limit.",
  INVALID_RANGE: "Invalid date range.",
  FORBIDDEN: "You are not allowed to do that.",
};

/** HTTP-ish classification for API responses. */
export const CONFLICT_CODES = new Set([
  "SLOT_BLOCKED",
  "SLOT_UNAVAILABLE",
  "SLOT_CONFLICT",
  "DAY_FULL",
  "DUPLICATE_REQUEST",
  "BLOCK_CONFLICTS_BOOKING",
  "LIMIT_CONFLICT",
  "TIMEZONE_LOCKED",
]);

export type MappedError = { code: string; message: string; detail?: string };

export function mapDbError(error: PgLikeError | null | undefined, opts: { exposeDetail?: boolean } = {}): MappedError {
  if (!error) return { code: "UNKNOWN", message: "Something went wrong. Please try again." };
  const code = error.message && BOOKING_ERROR_MESSAGES[error.message] ? error.message : undefined;
  if (code) {
    // `hint` is written by our own SQL and is safe to show; detail (booking refs) only to admins.
    return {
      code,
      message: error.hint || BOOKING_ERROR_MESSAGES[code],
      detail: opts.exposeDetail ? (error.details ?? undefined) : undefined,
    };
  }
  if (error.code === "23P01") return { code: "SLOT_CONFLICT", message: BOOKING_ERROR_MESSAGES.SLOT_CONFLICT };
  if (error.code === "23514") return { code: "INVALID_INPUT", message: "Some fields are invalid. Please check and try again." };
  if (error.code === "23505") return { code: "DUPLICATE", message: "That value already exists (e.g. a duplicate slug)." };
  if (error.code === "23503") return { code: "IN_USE", message: "This record is still referenced by bookings and cannot be deleted." };
  if (error.code === "42501") return { code: "FORBIDDEN", message: BOOKING_ERROR_MESSAGES.FORBIDDEN };
  return { code: "UNKNOWN", message: "Something went wrong. Please try again." };
}
