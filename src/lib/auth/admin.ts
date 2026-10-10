import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createServerSupabase } from "@/lib/supabase/server";

export type AdminContext = {
  supabase: Awaited<ReturnType<typeof createServerSupabase>>;
  userId: string;
  email: string | null;
};

/**
 * Resolves the signed-in administrator, or null. The role is read from `profiles` in the database,
 * never from client-editable user metadata. Deduplicated per request.
 */
export const getAdmin = cache(async (): Promise<AdminContext | null> => {
  const supabase = await createServerSupabase();
  const { data: auth, error } = await supabase.auth.getUser();
  if (error || !auth.user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
  if (profile?.role !== "admin") return null;
  return { supabase, userId: auth.user.id, email: auth.user.email ?? null };
});

/** For admin pages: redirects to the login page when the visitor is not an administrator. */
export async function requireAdmin(): Promise<AdminContext> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("UNAUTHORIZED");
  }
}

/** For Server Actions: throws instead of redirecting so the action can return a clean error. */
export async function assertAdmin(): Promise<AdminContext> {
  const admin = await getAdmin();
  if (!admin) throw new UnauthorizedError();
  return admin;
}
