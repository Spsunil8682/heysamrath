"use server";

import { refresh } from "next/cache";
import type { ActionState } from "@/lib/admin/action-state";
import { withAdmin, zodState } from "@/lib/admin/with-admin";
import { mapDbError } from "@/lib/booking/errors";
import { bookingEditSchema, bookingStatusChangeSchema } from "@/lib/validation/admin";

const verbs: Record<string, string> = {
  confirmed: "confirmed",
  rejected: "rejected",
  cancelled: "cancelled",
  completed: "marked completed",
  pending: "reopened",
};

/**
 * Status change. Confirmation re-checks availability inside the same transaction (DB trigger with the
 * calendar lock + exclusion constraint), so two simultaneous confirmations can never both succeed.
 */
export async function updateBookingStatus(id: string, status: string): Promise<ActionState> {
  return withAdmin(async ({ supabase }) => {
    const parsed = bookingStatusChangeSchema.safeParse({ id, status });
    if (!parsed.success) return { ok: false, message: "Invalid request." };
    const { data, error } = await supabase
      .from("bookings")
      .update({ status: parsed.data.status })
      .eq("id", parsed.data.id)
      .select("booking_reference")
      .maybeSingle();
    if (error) {
      const m = mapDbError(error, { exposeDetail: true });
      return { ok: false, message: m.detail && m.code === "SLOT_CONFLICT" ? `${m.message}` : m.message };
    }
    if (!data) return { ok: false, message: "Booking not found." };
    refresh();
    return { ok: true, message: `Booking ${data.booking_reference} ${verbs[parsed.data.status]}.` };
  });
}

export async function updateBooking(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return withAdmin(async ({ supabase }) => {
    const parsed = bookingEditSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return zodState(parsed.error);
    const v = parsed.data;
    const { error } = await supabase
      .from("bookings")
      .update({
        customer_name: v.customerName,
        phone: v.phone,
        email: v.email,
        service_id: v.serviceId,
        event_date: v.eventDate,
        start_time: v.startTime || null,
        end_time: v.endTime || null,
        location: v.location,
        budget: v.budget || null,
        requirements: v.requirements || null,
        admin_notes: v.adminNotes || null,
      })
      .eq("id", v.id);
    if (error) return { ok: false, message: mapDbError(error, { exposeDetail: true }).message };
    refresh();
    return { ok: true, message: "Booking saved." };
  });
}

export async function saveBookingNotes(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return withAdmin(async ({ supabase }) => {
    const id = String(formData.get("id") ?? "");
    const notes = String(formData.get("adminNotes") ?? "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(id) || notes.length > 8000) return { ok: false, message: "Invalid notes." };
    const { error } = await supabase.from("bookings").update({ admin_notes: notes || null }).eq("id", id);
    if (error) return { ok: false, message: mapDbError(error).message };
    refresh();
    return { ok: true, message: "Notes saved." };
  });
}
