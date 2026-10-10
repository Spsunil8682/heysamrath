"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/admin/action-state";
import { SetupError } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { clientIp, rateLimit } from "@/lib/utils/rate-limit";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
  password: z.string().min(1, "Enter your password").max(200),
});

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Enter your email and password." };

  const ip = clientIp(await headers());
  if (!rateLimit(`login:${ip}`, 10, 15 * 60_000)) {
    return { ok: false, message: "Too many sign-in attempts. Please wait 15 minutes and try again." };
  }

  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    // Same message for unknown email and wrong password.
    if (error || !data.user) return { ok: false, message: "Incorrect email or password." };

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      return { ok: false, message: "This account does not have administrator access." };
    }
  } catch (e) {
    if (e instanceof SetupError) return { ok: false, message: e.message };
    return { ok: false, message: "Sign-in is temporarily unavailable. Please try again." };
  }
  redirect("/admin");
}

export async function signOut() {
  try {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  } finally {
    redirect("/admin/login");
  }
}
