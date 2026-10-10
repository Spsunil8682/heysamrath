import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { siteConfig } from "@/lib/config/site";
import { isSupabaseConfigured } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";
import type { BusinessSettings, PortfolioCategory, PortfolioDisplayItem, PortfolioItem, Service } from "@/lib/types/database";
import { localPortfolioItems } from "./local-media";

/**
 * Public, cacheable reads. Each throws on database errors (errors are never cached), so pages show an
 * honest error state instead of stale or invented content. Admin mutations invalidate these tags.
 */
export const TAGS = { services: "services", portfolio: "portfolio", settings: "settings" } as const;

export class DataUnavailableError extends Error {
  constructor(what: string) {
    super(`Could not load ${what}`);
    this.name = "DataUnavailableError";
  }
}

const PORTFOLIO_COLUMNS =
  "id,title,description,category,media_type,media_url,thumbnail_url,alt_text,event_date,featured,published,display_order,created_at,updated_at";

export async function getActiveServices(): Promise<Service[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.services);
  const { data, error } = await createPublicClient()
    .from("services")
    .select("*")
    .eq("active", true)
    .order("display_order")
    .order("name");
  if (error) throw new DataUnavailableError("services");
  return data;
}

/** All published portfolio rows from the database (portfolios are small; filtering happens in memory). */
async function getDbPortfolio(): Promise<PortfolioItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.portfolio);
  const { data, error } = await createPublicClient()
    .from("portfolio_items")
    .select(PORTFOLIO_COLUMNS)
    .eq("published", true)
    .order("display_order")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw new DataUnavailableError("portfolio");
  return data as PortfolioItem[];
}

export type PortfolioResult = {
  items: PortfolioDisplayItem[];
  /** true when the database could not be reached and only the bundled local videos are shown. */
  partial: boolean;
};

/**
 * Database entries plus the bundled local video library (src/lib/config/local-media.json).
 * A local video that also has a database entry is shown once, using the database entry.
 * Without Supabase configured, the local library alone is shown. A database failure is reported
 * (`partial`), never hidden behind invented content.
 */
async function getAllPortfolio(): Promise<PortfolioResult> {
  const local = localPortfolioItems();
  let db: PortfolioDisplayItem[] = [];
  let partial = false;
  // Checked outside the cached function: error classes don't survive the `use cache` boundary.
  if (isSupabaseConfigured()) {
    try {
      db = await getDbPortfolio();
    } catch (e) {
      if (!local.length) throw e;
      console.error("Portfolio database unavailable; showing local videos only");
      partial = true;
    }
  }
  const dbUrls = new Set(db.map((i) => i.media_url));
  const items = [...db, ...local.filter((i) => !dbUrls.has(i.media_url))].sort(
    (a, b) =>
      Number(b.featured) - Number(a.featured) ||
      a.display_order - b.display_order ||
      b.created_at.localeCompare(a.created_at),
  );
  return { items, partial };
}

export async function getFeaturedPortfolio(limit = 6): Promise<PortfolioResult> {
  const { items, partial } = await getAllPortfolio();
  const featured = items.filter((i) => i.featured);
  // Fall back to the latest work so the home page never looks empty when nothing is flagged yet.
  return { items: (featured.length ? featured : items).slice(0, limit), partial };
}

export const PORTFOLIO_PAGE_SIZE = 12;

export async function getPortfolioPage(
  category: PortfolioCategory | null,
  page: number,
): Promise<PortfolioResult & { total: number }> {
  const { items, partial } = await getAllPortfolio();
  const filtered = category ? items.filter((i) => i.category === category) : items;
  const from = (page - 1) * PORTFOLIO_PAGE_SIZE;
  return { items: filtered.slice(from, from + PORTFOLIO_PAGE_SIZE), total: filtered.length, partial };
}

export async function getBusinessSettings(): Promise<BusinessSettings> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.settings);
  const { data, error } = await createPublicClient().from("business_settings").select("*").eq("id", 1).single();
  if (error || !data) throw new DataUnavailableError("settings");
  return data;
}

export type SiteInfo = {
  businessName: string;
  tagline: string;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  address: string | null;
  social: Record<string, string>;
  timezone: string;
  currency: string;
  hours: BusinessSettings["business_hours"] | null;
  /** false when the database could not be reached; contact details are then omitted, not invented. */
  live: boolean;
};

/** Brand + contact info for layout chrome. Falls back to static brand config (never invented contacts). */
export async function getSiteInfo(): Promise<SiteInfo> {
  try {
    const s = await getBusinessSettings();
    return {
      businessName: s.business_name,
      tagline: s.tagline || siteConfig.tagline,
      logoUrl: s.logo_url ?? siteConfig.logo,
      phone: s.phone,
      email: s.email,
      whatsapp: s.whatsapp,
      address: s.address,
      social: Object.fromEntries(Object.entries(s.social_links ?? {}).filter(([, v]) => !!v)) as Record<string, string>,
      timezone: s.timezone,
      currency: s.currency,
      hours: s.business_hours,
      live: true,
    };
  } catch {
    return {
      businessName: siteConfig.businessName,
      tagline: siteConfig.tagline,
      logoUrl: siteConfig.logo,
      phone: siteConfig.contact.phone || null,
      email: siteConfig.contact.email || null,
      whatsapp: siteConfig.contact.whatsapp || null,
      address: siteConfig.contact.address || null,
      social: siteConfig.social,
      timezone: siteConfig.timezone,
      currency: siteConfig.currency,
      hours: null,
      live: false,
    };
  }
}
