import "server-only";
import type { z } from "zod";
import { CONFLICT_CODES, type MappedError } from "@/lib/booking/errors";

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

export function statusFor(err: MappedError): number {
  if (err.code === "RATE_LIMITED") return 429;
  if (CONFLICT_CODES.has(err.code)) return 409;
  if (err.code === "UNKNOWN") return 500;
  return 422;
}

const MAX_BODY_BYTES = 16 * 1024;

/** Reads a small JSON body; returns null for oversized or malformed payloads. */
export async function readJson(request: Request): Promise<unknown | null> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) return null;
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Rejects cross-site form posts: the Origin (when present) must match this site. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host || origin === process.env.NEXT_PUBLIC_SITE_URL;
  } catch {
    return false;
  }
}
