import "server-only";
import type { AdminContext } from "@/lib/auth/admin";
import type { Service } from "@/lib/types/database";

export class AdminQueryError extends Error {}

export async function getAllServices(supabase: AdminContext["supabase"]): Promise<Service[]> {
  const { data, error } = await supabase.from("services").select("*").order("display_order").order("name");
  if (error) throw new AdminQueryError("services");
  return data;
}

/** Today's date in the business time zone, from the database's own clock and settings. */
export async function getBusinessToday(supabase: AdminContext["supabase"]) {
  const { data, error } = await supabase.from("business_settings").select("timezone").eq("id", 1).single();
  if (error || !data) throw new AdminQueryError("settings");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: data.timezone }).format(new Date());
  return { timezone: data.timezone, today };
}
