import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/**
 * Cookie-less client using the publishable key. Access is limited to what RLS grants `anon`
 * (active services, published portfolio, settings) and the public RPCs. Safe to use inside `use cache`.
 */
export function createPublicClient() {
  const { supabaseUrl, supabaseKey } = getPublicEnv();
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}
