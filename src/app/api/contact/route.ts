import { mapDbError } from "@/lib/booking/errors";
import { notifyOwnerOfMessage } from "@/lib/notifications/email";
import { createPublicClient } from "@/lib/supabase/public";
import { fieldErrors, json, readJson, sameOrigin, statusFor } from "@/lib/utils/api";
import { clientIp, looksAutomated, rateLimit } from "@/lib/utils/rate-limit";
import { contactSchema } from "@/lib/validation/contact";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ ok: false, code: "FORBIDDEN", message: "Invalid origin." }, 403);
  if (!rateLimit(`contact:${clientIp(request.headers)}`, 5, 10 * 60_000)) {
    return json({ ok: false, code: "RATE_LIMITED", message: "Too many messages. Please try again later." }, 429);
  }
  const body = await readJson(request);
  const parsed = contactSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return json({ ok: false, code: "INVALID_INPUT", message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) }, 422);
  }
  const v = parsed.data;
  if (looksAutomated(v.startedAt, v.website)) {
    return json({ ok: false, code: "INVALID_INPUT", message: "Your message could not be processed. Please try again." }, 400);
  }
  try {
    const { error } = await createPublicClient().rpc("submit_contact_message", {
      p_name: v.name,
      p_email: v.email,
      p_phone: v.phone || null,
      p_message: v.message,
    });
    if (error) {
      const mapped = mapDbError(error);
      return json({ ok: false, ...mapped }, statusFor(mapped));
    }
    const email = await notifyOwnerOfMessage({ name: v.name, email: v.email, message: v.message });
    if (email.status === "failed") console.warn("Owner message notification failed:", email.reason);
    return json({ ok: true }, 201);
  } catch {
    return json({ ok: false, code: "UNAVAILABLE", message: "Messaging is temporarily unavailable. Your message was not saved." }, 503);
  }
}
