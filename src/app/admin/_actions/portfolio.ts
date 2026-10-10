"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import type { ActionState } from "@/lib/admin/action-state";
import { withAdmin, zodState } from "@/lib/admin/with-admin";
import { mapDbError } from "@/lib/booking/errors";
import { TAGS } from "@/lib/data/public";
import type { PortfolioCategory } from "@/lib/types/database";
import { portfolioSchema } from "@/lib/validation/admin";

export async function savePortfolioItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const result = await withAdmin(async ({ supabase }) => {
    const parsed = portfolioSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return zodState(parsed.error);
    const v = parsed.data;
    const row = {
      title: v.title,
      description: v.description,
      category: v.category as PortfolioCategory,
      media_type: v.mediaType,
      media_url: v.mediaUrl,
      thumbnail_url: v.thumbnailUrl,
      alt_text: v.altText,
      event_date: v.eventDate || null,
      featured: v.featured,
      published: v.published,
      display_order: v.displayOrder,
    };
    const { error } = v.id
      ? await supabase.from("portfolio_items").update(row).eq("id", v.id)
      : await supabase.from("portfolio_items").insert(row);
    if (error) return { ok: false, message: mapDbError(error).message };
    updateTag(TAGS.portfolio);
    return { ok: true, message: "Portfolio item saved." };
  });
  if (result.ok) redirect("/admin/portfolio");
  return result;
}

export async function deletePortfolioItem(id: string): Promise<ActionState> {
  return withAdmin(async ({ supabase }) => {
    const { error } = await supabase.from("portfolio_items").delete().eq("id", id);
    if (error) return { ok: false, message: mapDbError(error).message };
    updateTag(TAGS.portfolio);
    return { ok: true, message: "Item deleted. (Media files themselves are not deleted.)" };
  });
}

export async function togglePortfolioFlag(id: string, flag: "published" | "featured", value: boolean): Promise<ActionState> {
  return withAdmin(async ({ supabase }) => {
    const { error } = await supabase.from("portfolio_items").update(flag === "published" ? { published: value } : { featured: value }).eq("id", id);
    if (error) return { ok: false, message: mapDbError(error).message };
    updateTag(TAGS.portfolio);
    return { ok: true };
  });
}

export async function movePortfolioItem(id: string, direction: "up" | "down"): Promise<ActionState> {
  return withAdmin(async ({ supabase }) => {
    const { data, error } = await supabase
      .from("portfolio_items")
      .select("id,display_order")
      .order("display_order")
      .order("created_at", { ascending: false });
    if (error || !data) return { ok: false, message: "Could not reorder." };
    const i = data.findIndex((s) => s.id === id);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= data.length) return { ok: true };
    const order = data.map((s) => s.id);
    [order[i], order[j]] = [order[j], order[i]];
    for (const [idx, pid] of order.entries()) {
      const { error: e } = await supabase.from("portfolio_items").update({ display_order: (idx + 1) * 10 }).eq("id", pid);
      if (e) return { ok: false, message: "Could not reorder." };
    }
    updateTag(TAGS.portfolio);
    return { ok: true };
  });
}
