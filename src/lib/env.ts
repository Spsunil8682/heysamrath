/**
 * Environment validation. Only NEXT_PUBLIC_* values are read here, so this module is safe to import
 * from client code. Server-only secrets live in `env.server.ts`.
 */
export class SetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SetupError";
  }
}

export type PublicEnv = { supabaseUrl: string; supabaseKey: string; siteUrl: string };

export function getPublicEnv(): PublicEnv {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // Publishable key (sb_publishable_...) preferred; the legacy anon key also works until Supabase retires it.
  const supabaseKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();

  const missing: string[] = [];
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseKey) missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  if (missing.length) {
    throw new SetupError(
      `Missing environment variable(s): ${missing.join(", ")}. Copy .env.example to .env.local and fill in the ` +
        `values from Supabase → Project Settings → API Keys, then restart the dev server.`,
    );
  }
  if (!/^https:\/\/|^http:\/\/(localhost|127\.0\.0\.1)/.test(supabaseUrl!)) {
    throw new SetupError("NEXT_PUBLIC_SUPABASE_URL must be the https:// URL of your Supabase project.");
  }
  if (supabaseKey!.startsWith("sb_secret_")) {
    throw new SetupError(
      "A Supabase SECRET key was put in NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Use the publishable key; " +
        "rotate the secret key in Supabase immediately because it may have been exposed.",
    );
  }
  return { supabaseUrl: supabaseUrl!, supabaseKey: supabaseKey!, siteUrl: getSiteUrl() };
}

export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined) ??
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

/** True when the Supabase variables are present and valid (no throw). */
export function isSupabaseConfigured(): boolean {
  try {
    getPublicEnv();
    return true;
  } catch {
    return false;
  }
}
