import { createHash } from "node:crypto";

/**
 * Cloudinary upload signature: SHA-1 of the alphabetically sorted `key=value` pairs joined with `&`,
 * followed by the API secret. https://cloudinary.com/documentation/authentication_signatures
 */
export function signCloudinaryParams(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .filter((k) => params[k] !== "" && params[k] !== undefined && params[k] !== null)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(toSign + apiSecret).digest("hex");
}
