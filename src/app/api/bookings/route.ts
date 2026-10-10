import { mapDbError } from "@/lib/booking/errors";
import { SetupError } from "@/lib/env";
import { notifyOwnerOfBooking } from "@/lib/notifications/email";
import { createPublicClient } from "@/lib/supabase/public";
import { fieldErrors, json, readJson, sameOrigin, statusFor } from "@/lib/utils/api";
import { clientIp, looksAutomated, rateLimit } from "@/lib/utils/rate-limit";
import { bookingRequestSchema } from "@/lib/validation/booking";

type RpcResult = {
  booking_reference: string;
  status: "pending";
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  service_name: string;
};

/** Creates a *pending* booking request. All availability rules are enforced again inside Postgres. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ ok: false, code: "FORBIDDEN", message: "Invalid origin." }, 403);
  if (!rateLimit(`booking:${clientIp(request.headers)}`, 8, 10 * 60_000)) {
    return json({ ok: false, code: "RATE_LIMITED", message: "Too many requests. Please try again in a few minutes." }, 429);
  }

  const body = await readJson(request);
  if (!body) return json({ ok: false, code: "INVALID_INPUT", message: "Invalid request." }, 400);

  const parsed = bookingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { ok: false, code: "INVALID_INPUT", message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) },
      422,
    );
  }
  const v = parsed.data;
  if (looksAutomated(v.startedAt, v.website)) {
    return json({ ok: false, code: "INVALID_INPUT", message: "Your request could not be processed. Please try again." }, 400);
  }

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc("create_booking_request", {
      p_customer_name: v.customerName,
      p_phone: v.phone,
      p_email: v.email,
      p_service_id: v.serviceId,
      p_event_date: v.eventDate,
      p_start_time: v.startTime || null,
      p_end_time: v.endTime || null,
      p_location: v.location,
      p_budget: v.budget || null,
      p_requirements: v.requirements || null,
      p_consent: v.consent,
    });
    if (error) {
      const mapped = mapDbError(error);
      if (mapped.code === "UNKNOWN") console.error("create_booking_request failed", error.code);
      return json({ ok: false, ...mapped }, statusFor(mapped));
    }
    const result = data as unknown as RpcResult;

    // The booking is committed at this point; notification failures never undo it.
    const email = await notifyOwnerOfBooking({
      reference: result.booking_reference,
      serviceName: result.service_name,
      eventDate: result.event_date,
      startTime: result.start_time,
      customerName: v.customerName,
      customerEmail: v.email,
    });
    if (email.status === "failed") console.warn("Owner booking notification failed:", email.reason);

    return json({ ok: true, data: result }, 201);
  } catch (e) {
    if (e instanceof SetupError) console.error(e.message);
    else console.error("Booking request error", e instanceof Error ? e.name : e);
    return json(
      { ok: false, code: "UNAVAILABLE", message: "Our booking system is temporarily unavailable. Your request was not saved." },
      503,
    );
  }
}
