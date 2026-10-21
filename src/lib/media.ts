/**
 * Media abstraction. UI components never care whether a file is bundled locally under /public/media
 * or hosted on Cloudinary: they receive a resolved `MediaSource` from here.
 *
 * Allowed sources (mirrors `public.is_allowed_media_url` in the database):
 *   - Local:      /media/images/x.jpg, /media/videos/x.mp4, /media/thumbnails/x.jpg, /media/logos/x.svg
 *   - Cloudinary: https://res.cloudinary.com/<cloud>/(image|video)/upload/...
 */

export type MediaProvider = "local" | "cloudinary";
export type MediaSource = { url: string; provider: MediaProvider };

const LOCAL_RE = /^\/media\/[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const CLOUDINARY_RE = /^https:\/\/res\.cloudinary\.com\/[A-Za-z0-9_-]+\/(image|video)\/upload\/[A-Za-z0-9_./,:%-]+$/;

export function isAllowedMediaUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  if (LOCAL_RE.test(url)) return !url.includes("..") && !url.includes("//");
  return CLOUDINARY_RE.test(url);
}

/** Formats most browsers can't display (iPhone photos); Cloudinary converts them when asked for .jpg. */
const NON_WEB_IMAGE_RE = /(\/image\/upload\/.+)\.(heic|heif|tiff?)$/i;

export function resolveMedia(url: string | null | undefined): MediaSource | null {
  if (!isAllowedMediaUrl(url)) return null;
  if (url.startsWith("/")) return { url, provider: "local" };
  return { url: url.replace(NON_WEB_IMAGE_RE, "$1.jpg"), provider: "cloudinary" };
}

/**
 * Inserts a Cloudinary transformation (e.g. "f_auto,q_auto,w_1200") after `/upload/`.
 * Local URLs are returned unchanged (Next.js optimizes them).
 */
export function withCloudinaryTransform(url: string, transform: string): string {
  if (!CLOUDINARY_RE.test(url)) return url;
  return url.replace(/\/upload\/(?!(?:[a-z]+_[^/]+,?)+\/)/, `/upload/${transform}/`);
}

/** Video URL for playback: Cloudinary videos get automatic format/quality; local files as-is. */
export function videoPlaybackUrl(url: string): string {
  return withCloudinaryTransform(url, "f_auto,q_auto");
}

/** Poster for a video: the stored thumbnail, or a Cloudinary-generated frame when hosted there. */
export function videoPosterUrl(mediaUrl: string, thumbnailUrl: string | null): string | null {
  if (isAllowedMediaUrl(thumbnailUrl)) return thumbnailUrl;
  if (/^https:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\//.test(mediaUrl)) {
    return withCloudinaryTransform(mediaUrl, "so_2,f_jpg,q_auto,w_1280").replace(/\.[a-z0-9]+$/i, ".jpg");
  }
  return null;
}

/** The image to show in a grid tile for any portfolio item. */
export function tileImageUrl(item: { media_type: "image" | "video"; media_url: string; thumbnail_url: string | null }) {
  if (item.media_type === "image") return isAllowedMediaUrl(item.thumbnail_url) ? item.thumbnail_url : item.media_url;
  return videoPosterUrl(item.media_url, item.thumbnail_url);
}
