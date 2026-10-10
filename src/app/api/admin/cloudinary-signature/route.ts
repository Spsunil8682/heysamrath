import { getAdmin } from "@/lib/auth/admin";
import { signCloudinaryParams } from "@/lib/cloudinary/sign";
import { json, sameOrigin } from "@/lib/utils/api";

/**
 * Returns a short-lived signature so the admin's browser can upload directly to Cloudinary
 * without ever seeing CLOUDINARY_API_SECRET. Admin-only; disabled until Cloudinary is configured.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ ok: false, message: "Invalid origin." }, 403);
  const admin = await getAdmin();
  if (!admin) return json({ ok: false, message: "Unauthorized" }, 401);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return json({ ok: false, message: "Cloudinary is not configured. See docs/CLOUDINARY.md." }, 501);
  }

  // Only parameters chosen by the server are signed: the browser cannot change the folder.
  const params = { folder: "portfolio", timestamp: Math.floor(Date.now() / 1000) };
  return json({
    ok: true,
    data: { ...params, cloudName, apiKey, signature: signCloudinaryParams(params, apiSecret) },
  });
}
