import { MapPin, Sparkles } from "lucide-react";
import { connection } from "next/server";
import { Suspense } from "react";
import { LinkButton } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/container";
import { WhatsAppLink } from "@/components/whatsapp/whatsapp-link";
import {
  isOfferActive,
  navratriOffer,
  packagePrice,
  REGULAR_PRICE_PER_REEL,
  regularPackages,
  TRAVEL_NOTE,
} from "@/lib/config/pricing";
import { siteConfig } from "@/lib/config/site";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";

const inr = (n: number) => formatPrice(n, siteConfig.currency);
const reelsLabel = (n: number) => `${n} ${n === 1 ? "Reel" : "Reels"}`;

export function RegularPricing({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-line bg-panel p-6 sm:p-8", className)}>
      <h3 className="font-display text-3xl">Reel packages</h3>
      <p className="mt-2 text-sm text-muted">
        {inr(REGULAR_PRICE_PER_REEL)} per reel. Book more reels and save.
      </p>
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs tracking-wide text-subtle uppercase">
            <th scope="col" className="py-3 font-medium">Package</th>
            <th scope="col" className="py-3 text-right font-medium">Original</th>
            <th scope="col" className="py-3 text-right font-medium">Discount</th>
            <th scope="col" className="py-3 text-right font-medium">Final price</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {regularPackages.map((p) => {
            const price = packagePrice(p.reels, p.discount);
            return (
              <tr key={p.reels}>
                <th scope="row" className="py-4 text-left font-medium">{reelsLabel(p.reels)}</th>
                <td className="py-4 text-right text-muted tabular-nums">{inr(price.original)}</td>
                <td className="py-4 text-right tabular-nums text-muted">{p.discount ? `− ${inr(p.discount)}` : "—"}</td>
                <td className="py-4 text-right font-display text-xl text-gold-bright tabular-nums">{inr(price.final)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-6 flex items-start gap-2 text-sm text-muted">
        <MapPin className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
        {TRAVEL_NOTE}
      </p>
    </div>
  );
}

/**
 * The festive Navratri card. Rendered only while the offer is active (checked on the server, per
 * request, in the business time zone), so it disappears by itself when the offer ends.
 * Wrap in <Suspense>.
 */
export async function NavratriOffer({ className }: { className?: string }) {
  await connection();
  if (!isOfferActive(navratriOffer, new Date(), siteConfig.timezone)) return null;

  return (
    <section
      aria-labelledby="navratri-title"
      className={cn(
        "relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-[#3b0d1a] via-[#2a0f12] to-ink p-8 sm:p-12",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-gold/20 blur-3xl"
        aria-hidden
      />
      <div className="relative grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
        <div>
          <Eyebrow className="flex items-center gap-2">
            <Sparkles className="size-4" aria-hidden />
            Navratri Special Offer
          </Eyebrow>
          <h2 id="navratri-title" className="mt-4 font-display text-4xl leading-tight text-balance sm:text-5xl">
            Your Garba moves. Your festive vibe. Your cinematic reel.
          </h2>
          <p className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="text-xl text-subtle line-through">
              <span className="sr-only">Regular price </span>
              {inr(REGULAR_PRICE_PER_REEL)}
            </span>
            <span className="font-display text-5xl text-gold-bright sm:text-6xl">
              <span className="sr-only">Offer price </span>
              {inr(navratriOffer.pricePerReel)}
            </span>
            <span className="text-muted">per reel</span>
          </p>
          <p className="mt-6 max-w-xl leading-relaxed text-muted">
            Capture your traditional look, Garba performance, and festive memories in stunning vertical reels perfect
            for Instagram.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/booking?service=events" size="lg">
              Book Your Navratri Reel
            </LinkButton>
            <Suspense fallback={null}>
              <WhatsAppLink
                size="lg"
                label="WhatsApp"
                className="bg-black/20"
                message={`Hi {business}, I'd like to book a Navratri reel at the ${inr(navratriOffer.pricePerReel)} offer. My date is: `}
              />
            </Suspense>
          </div>
          <p className="mt-4 text-xs text-subtle">
            Limited-period offer. Travel charges extra, based on location. Navratri pricing applies to Navratri reels only
            and can&apos;t be combined with package discounts.
          </p>
        </div>
        <ul className="divide-y divide-line rounded-2xl border border-line bg-ink/60 backdrop-blur">
          {navratriOffer.quantities.map((q) => (
            <li key={q} className="flex items-center justify-between px-6 py-4">
              <span>
                {q} Navratri {q === 1 ? "reel" : "reels"}
              </span>
              <span className="font-display text-2xl text-gold-bright tabular-nums">
                {inr(q * navratriOffer.pricePerReel)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
