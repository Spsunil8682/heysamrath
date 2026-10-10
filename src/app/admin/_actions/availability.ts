"use server";

import { refresh } from "next/cache";
import type { ActionState } from "@/lib/admin/action-state";
import { withAdmin, zodState } from "@/lib/admin/with-admin";
import { mapDbError } from "@/lib/booking/errors";
import { blockSchema } from "@/lib/validation/admin";

export async function createBlock(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return withAdmin(async ({ supabase, userId }) => {
    const parsed = blockSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return zodState(parsed.error);
    const v = parsed.data;
    const { error } = await supabase.from("availability_blocks").insert({
      start_date: v.startDate,
      end_date: v.endDate,
      start_time: v.startTime || null,
      end_time: v.endTime || null,
      reason: v.reason || null,
      created_by: userId,
    });
    if (error) {
      const m = mapDbError(error, { exposeDetail: true });
      return { ok: false, message: m.detail ? `${m.message} (${m.detail})` : m.message };
    }
    refresh();
    return { ok: true, message: "Time blocked." };
  });
}

export async function deleteBlock(id: string): Promise<ActionState> {
  return withAdmin(async ({ supabase }) => {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: "Invalid id." };
    const { error } = await supabase.from("availability_blocks").delete().eq("id", id);
    if (error) return { ok: false, message: mapDbError(error).message };
    refresh();
    return { ok: true, message: "Block removed." };
  });
}
