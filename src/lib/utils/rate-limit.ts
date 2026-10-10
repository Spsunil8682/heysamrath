import "server-only";

/**
 * Best-effort in-memory sliding-window limiter keyed by client IP. On serverless hosts each instance
 * has its own memory, so this only slows bursts; the authoritative throttles live in the database
 * functions (per contact and global). For stronger guarantees add a shared store (e.g. Upstash Redis)
 * or the host's firewall rate limiting.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return true;
}

export function clientIp(headers: Headers): string {
  return (
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/** Rejects submissions that are implausibly fast (bots) using the time the form was rendered. */
export function looksAutomated(startedAt: number | undefined, honeypot: string | undefined): boolean {
  if (honeypot) return true;
  if (!startedAt) return false;
  const elapsed = Date.now() - startedAt;
  return elapsed >= 0 && elapsed < 2500;
}
