import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/** Session-aware client for Server Components, Server Actions and Route Handlers. */
export async function createServerSupabase() {
  // Read cookies first: during prerendering this defers the caller to request time.
  const cookieStore = await cookies();
  const { supabaseUrl, supabaseKey } = getPublicEnv();
  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only. The proxy refreshes sessions.
        }
      },
    },
  });
}
