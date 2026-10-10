import { describe, expect, it } from "vitest";
import { isOfferActive, navratriOffer, packagePrice, regularPackages } from "@/lib/config/pricing";
import { services } from "@/lib/config/services";

const tz = "Asia/Kolkata";

describe("reel pricing", () => {
  it("matches the published package table", () => {
    expect(regularPackages.map((p) => packagePrice(p.reels, p.discount).final)).toEqual([1500, 2800, 4000, 6500]);
    expect(packagePrice(5, 1000).original).toBe(7500);
  });

  it("prices the Navratri offer per reel without package discounts", () => {
    expect(navratriOffer.quantities.map((q) => q * navratriOffer.pricePerReel)).toEqual([1200, 2400, 3600, 6000]);
    expect(navratriOffer.combinesWithPackageDiscounts).toBe(false);
  });
});

describe("offer dates", () => {
  const offer = { startDate: "2026-10-10", endDate: "2026-10-20" };

  it("is active on the first and last day in India time", () => {
    expect(isOfferActive(offer, new Date("2026-10-09T18:30:00Z"), tz)).toBe(true); // 10 Oct 00:00 IST
    expect(isOfferActive(offer, new Date("2026-10-20T18:29:00Z"), tz)).toBe(true); // 20 Oct 23:59 IST
  });

  it("is inactive before and after", () => {
    expect(isOfferActive(offer, new Date("2026-10-09T18:29:00Z"), tz)).toBe(false); // 9 Oct 23:59 IST
    expect(isOfferActive(offer, new Date("2026-10-20T18:30:00Z"), tz)).toBe(false); // 21 Oct 00:00 IST
  });
});

describe("service descriptions", () => {
  it("has unique slugs and existing images", async () => {
    const { existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    expect(new Set(services.map((s) => s.slug)).size).toBe(services.length);
    const { posterFor } = await import("@/lib/data/local-media");
    for (const s of services) {
      expect(existsSync(join(process.cwd(), "public", s.image))).toBe(true);
      if (s.posterOf) expect(posterFor(s.posterOf), s.posterOf).toBeTruthy();
    }
  });
});
