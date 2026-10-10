"use server";

import { refresh, updateTag } from "next/cache";
import type { ActionState } from "@/lib/admin/action-state";
import { withAdmin, zodState } from "@/lib/admin/with-admin";
import { mapDbError } from "@/lib/booking/errors";
import { TAGS } from "@/lib/data/public";
import type { BusinessHours } from "@/lib/types/database";
import { formatDateOnly, formatTime } from "@/lib/utils/format";
import { settingsSchema } from "@/lib/validation/admin";

const DAYS = ["1", "2", "3", "4", "5", "6", "7"] as const;

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return withAdmin(async ({ supabase }) => {
    const raw = Object.fromEntries(formData) as Record<string, string>;
    const hours = Object.fromEntries(
      DAYS.map((d) => [d, { closed: raw[`hours.${d}.closed`] ?? "", open: raw[`hours.${d}.open`] ?? "", close: raw[`hours.${d}.close`] ?? "" }]),
    );
    const parsed = settingsSchema.safeParse({ ...raw, hours });
    if (!parsed.success) return zodState(parsed.error);
    const v = parsed.data;

    const businessHours: BusinessHours = Object.fromEntries(
      DAYS.map((d) => [d, v.hours[d]?.closed ? null : { open: v.hours[d]!.open, close: v.hours[d]!.close }]),
    );

    const { error } = await supabase
      .from("business_settings")
      .update({
        business_name: v.businessName,
        tagline: v.tagline || null,
        logo_url: v.logoUrl,
        phone: v.phone || null,
        email: v.email || null,
        whatsapp: v.whatsapp || null,
        address: v.address || null,
        social_links: Object.fromEntries(
          Object.entries({ instagram: v.instagram, youtube: v.youtube, facebook: v.facebook }).filter(([, u]) => !!u),
        ),
        business_hours: businessHours,
        timezone: v.timezone,
        currency: v.currency,
        buffer_minutes: v.bufferMinutes,
        min_notice_hours: v.minNoticeHours,
        max_advance_days: v.maxAdvanceDays,
        allow_multiple_per_day: v.allowMultiplePerDay,
        max_bookings_per_day: v.maxBookingsPerDay,
      })
      .eq("id", 1);
    if (error) {
      const m = mapDbError(error, { exposeDetail: true });
      return { ok: false, message: m.detail ? `${m.message} Dates: ${m.detail}` : m.message };
    }
    updateTag(TAGS.settings);
    refresh();

    // Confirmed bookings are never silently dropped by an hours change; surface them instead.
    const { data: outside } = await supabase.rpc("confirmed_bookings_outside_hours");
    const warnings = (outside ?? []).map(
      (b) =>
        `${b.booking_reference} on ${formatDateOnly(b.event_date)}${b.start_time ? ` at ${formatTime(b.start_time)}` : ""} is outside the new working hours. It stays confirmed.`,
    );
    return { ok: true, message: "Settings saved.", warnings };
  });
}
