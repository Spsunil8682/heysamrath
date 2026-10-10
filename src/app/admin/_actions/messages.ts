"use server";

import { refresh } from "next/cache";
import type { ActionState } from "@/lib/admin/action-state";
import { withAdmin } from "@/lib/admin/with-admin";
import { mapDbError } from "@/lib/booking/errors";

export async function setMessageHandled(id: string, handled: boolean): Promise<ActionState> {
  return withAdmin(async ({ supabase }) => {
    const { error } = await supabase.from("contact_messages").update({ handled }).eq("id", id);
    if (error) return { ok: false, message: mapDbError(error).message };
    refresh();
    return { ok: true };
  });
}

export async function deleteMessage(id: string): Promise<ActionState> {
  return withAdmin(async ({ supabase }) => {
    const { error } = await supabase.from("contact_messages").delete().eq("id", id);
    if (error) return { ok: false, message: mapDbError(error).message };
    refresh();
    return { ok: true, message: "Message deleted." };
  });
}
