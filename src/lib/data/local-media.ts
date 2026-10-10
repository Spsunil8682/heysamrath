import { portfolioCategories } from "@/lib/config/site";
import manifest from "@/lib/config/local-media.json";
import { isAllowedMediaUrl } from "@/lib/media";
import type { PortfolioCategory, PortfolioDisplayItem } from "@/lib/types/database";

/**
 * Videos imported from the footage folder by `npm run media:import` (see scripts/import-media.mjs).
 * The manifest ships with the build, so these work without a database. Edit titles, categories and
 * flags in src/lib/config/local-media.json.
 */
type ManifestVideo = {
  slug: string;
  title: string;
  description?: string;
  category: string;
  altText?: string;
  featured?: boolean;
  published?: boolean;
  hero?: boolean;
  /** Also play this clip in the hero on phones (phones only show clips marked this way). */
  heroMobile?: boolean;
  video?: string;
  poster?: string;
  heroClip?: string;
  width?: number;
  height?: number;
  /** Display label supplied by the owner, e.g. "1M". Shown as "1M views". */
  views?: string;
  instagramUrl?: string;
};

const INSTAGRAM_RE = /^https:\/\/www\.instagram\.com\/(reel|p)\/[A-Za-z0-9_-]+\/?$/;
const VIEWS_RE = /^[0-9][0-9.,]*\s?[KkMm]?\+?$/;

const CATEGORIES = new Set<string>(portfolioCategories.map((c) => c.value));
const videos = (manifest.videos as ManifestVideo[]).filter(
  (v) => isAllowedMediaUrl(v.video) && isAllowedMediaUrl(v.poster),
);

/** Published local videos, shaped like database portfolio rows so the same UI renders both. */
export function localPortfolioItems(): PortfolioDisplayItem[] {
  return videos
    .filter((v) => v.published !== false)
    .map((v, i) => ({
      id: `local-${v.slug}`,
      title: v.title,
      description: v.description ?? "",
      category: (CATEGORIES.has(v.category) ? v.category : "events") as PortfolioCategory,
      media_type: "video" as const,
      media_url: v.video!,
      thumbnail_url: v.poster!,
      alt_text: v.altText ?? "",
      event_date: null,
      featured: v.featured === true,
      published: true,
      display_order: (i + 1) * 10,
      created_at: "",
      updated_at: "",
      social_url: v.instagramUrl && INSTAGRAM_RE.test(v.instagramUrl) ? v.instagramUrl : null,
      views_label: v.views && VIEWS_RE.test(v.views.trim()) ? v.views.trim() : null,
    }));
}

export type HeroClip = { src: string; poster: string; landscape: boolean; mobile: boolean };

/** Short muted clips for the rotating home-page background. */
export function heroClips(): HeroClip[] {
  return videos
    .filter((v) => v.published !== false && v.hero !== false && isAllowedMediaUrl(v.heroClip))
    .map((v) => ({
      src: v.heroClip!,
      poster: v.poster!,
      landscape: (v.width ?? 16) >= (v.height ?? 9),
      mobile: v.heroMobile === true,
    }));
}

export function localLibrary(): ManifestVideo[] {
  return videos;
}

/** Poster image of a local-library video, by slug (paths are content-hashed, so never hard-code them). */
export function posterFor(slug: string | undefined): string | null {
  if (!slug) return null;
  return videos.find((v) => v.slug === slug)?.poster ?? null;
}
