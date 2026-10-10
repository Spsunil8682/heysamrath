"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import type { ActionState } from "@/lib/admin/action-state";
import { withAdmin, zodState } from "@/lib/admin/with-admin";
import { mapDbError } from "@/lib/booking/errors";
import { TAGS } from "@/lib/data/public";
import { serviceSchema } from "@/lib/validation/admin";

export async function saveService(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const result = await withAdmin(async ({ supabase }) => {
    const parsed = serviceSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return zodState(parsed.error);
    const v = parsed.data;
    const row = {
      name: v.name,
      slug: v.slug,
      description: v.description,
      price: v.price,
      price_is_starting: v.priceIsStarting,
      currency: v.currency,
      duration_minutes: v.durationMinutes,
      booking_mode: v.bookingMode,
      blocks_calendar: v.blocksCalendar,
      cover_image_url: v.coverImageUrl,
      active: v.active,
      display_order: v.displayOrder,
    };
    const { error } = v.id
      ? await supabase.from("services").update(row).eq("id", v.id)
      : await supabase.from("services").insert(row);
    if (error) {
      const m = mapDbError(error);
      return m.code === "DUPLICATE" ? { ok: false, fieldErrors: { slug: "This slug is already used" }, message: m.message } : { ok: false, message: m.message };
    }
    updateTag(TAGS.services);
    return { ok: true, message: "Service saved." };
  });
  if (result.ok) redirect("/admin/services");
  return result;
}

export async function deleteService(id: string): Promise<ActionState> {
  return withAdmin(async ({ supabase }) => {
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) {
      const m = mapDbError(error);
      return {
        ok: false,
        message: m.code === "IN_USE" ? "This service has bookings. Deactivate it instead of deleting it." : m.message,
      };
    }
    updateTag(TAGS.services);
    return { ok: true, message: "Service deleted." };
  });
}

export async function moveService(id: string, direction: "up" | "down"): Promise<ActionState> {
  return withAdmin(async ({ supabase }) => {
    const { data, error } = await supabase.from("services").select("id,display_order").order("display_order").order("name");
    if (error || !data) return { ok: false, message: "Could not reorder." };
    const i = data.findIndex((s) => s.id === id);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= data.length) return { ok: true };
    // Normalise to 10, 20, 30… then swap the two neighbours.
    const order = data.map((s) => s.id);
    [order[i], order[j]] = [order[j], order[i]];
    for (const [idx, sid] of order.entries()) {
      const { error: e } = await supabase.from("services").update({ display_order: (idx + 1) * 10 }).eq("id", sid);
      if (e) return { ok: false, message: "Could not reorder." };
    }
    updateTag(TAGS.services);
    return { ok: true };
  });
}
