import type { NextRequest } from "next/server";
import { mapDbError } from "@/lib/booking/errors";
import { createPublicClient } from "@/lib/supabase/public";
import { json } from "@/lib/utils/api";
import { clientIp, rateLimit } from "@/lib/utils/rate-limit";
import { availabilityQuerySchema } from "@/lib/validation/booking";

/** Public availability for a date range. Contains no customer data (enforced by the SQL function). */
export async function GET(request: NextRequest) {
  if (!rateLimit(`availability:${clientIp(request.headers)}`, 120, 60_000)) {
    return json({ ok: false, code: "RATE_LIMITED", message: "Too many requests." }, 429);
  }
  const parsed = availabilityQuerySchema.safeParse({
    from: request.nextUrl.searchParams.get("from"),
    to: request.nextUrl.searchParams.get("to"),
  });
  if (!parsed.success) return json({ ok: false, code: "INVALID_INPUT", message: "Invalid date range." }, 400);

  try {
    const { data, error } = await createPublicClient().rpc("get_availability", {
      p_from: parsed.data.from,
      p_to: parsed.data.to,
    });
    if (error) {
      const mapped = mapDbError(error);
      return json({ ok: false, ...mapped }, mapped.code === "INVALID_RANGE" ? 400 : 503);
    }
    return json({ ok: true, data });
  } catch {
    return json({ ok: false, code: "UNAVAILABLE", message: "Availability is temporarily unavailable. Please try again." }, 503);
  }
}
