/**
 * Reel prices shown on the website (INR). Edit them here.
 *
 * These prices are only displayed: the booking form does not calculate a price, and every quote
 * is confirmed with the customer. Travel is always quoted separately.
 */
export const REGULAR_PRICE_PER_REEL = 1500;

/** Multi-reel packages: the final price is the original (reels × regular price) minus the discount. */
export const regularPackages = [
  { reels: 1, discount: 0 },
  { reels: 2, discount: 200 },
  { reels: 3, discount: 500 },
  { reels: 5, discount: 1000 },
] as const;

export const navratriOffer = {
  title: "Navratri Special Offer",
  pricePerReel: 1200,
  /** Offer quantities; each is reels × pricePerReel. */
  quantities: [1, 2, 3, 5],
  /**
   * The offer is active from startDate to endDate inclusive, in the business time zone
   * (Asia/Kolkata). Outside these dates the offer card is hidden and Navratri reels use the
   * regular packages.
   */
  startDate: "2026-10-10",
  endDate: "2026-10-20",
  /** Navratri pricing is never combined with the regular multi-reel discounts. */
  combinesWithPackageDiscounts: false,
} as const;

export const TRAVEL_NOTE = "Travel charges extra: to be confirmed based on location.";

export function packagePrice(reels: number, discount: number) {
  const original = reels * REGULAR_PRICE_PER_REEL;
  return { original, discount, final: original - discount };
}

/** Today's date (YYYY-MM-DD) in the given time zone. */
export function localDate(now: Date, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function isOfferActive(
  offer: { startDate: string; endDate: string },
  now: Date,
  timeZone: string,
): boolean {
  const today = localDate(now, timeZone);
  return today >= offer.startDate && today <= offer.endDate;
}
