import { Check, Clapperboard } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { NavratriOffer, RegularPricing } from "@/components/pricing/reel-pricing";
import { LinkButton } from "@/components/ui/button";
import { WhatsAppLink } from "@/components/whatsapp/whatsapp-link";
import { Container, PageHeader, SectionHeading } from "@/components/ui/container";
import { services } from "@/lib/config/services";
import { posterFor } from "@/lib/data/local-media";

export const metadata: Metadata = {
  title: "Services & Pricing",
  description:
    "Wedding function reels, couple and pre-wedding reels, model and fashion reels, makeup and salon reels, business promotion reels, event and festival reels, and professional reels editing.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Services"
        title="Reels for every moment"
        intro="Cinematic, trending vertical reels for weddings, couples, models, beauty professionals, businesses and events, or just the edit if you already have footage."
      />

      <Container>
        <Suspense fallback={null}>
          <NavratriOffer className="mt-16 sm:mt-20" />
        </Suspense>
      </Container>

      <Container className="py-20 sm:py-28">
        <ul className="space-y-20 sm:space-y-28">
          {services.map((s, i) => (
            <li key={s.slug} id={s.slug} className="grid scroll-mt-28 items-center gap-10 lg:grid-cols-2">
              <div className={`relative aspect-[4/3] overflow-hidden rounded-2xl bg-panel ${i % 2 ? "lg:order-2" : ""}`}>
                <Image src={posterFor(s.posterOf) ?? s.image} alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
              </div>
              <div>
                <p className="font-display text-lg text-subtle">{String(i + 1).padStart(2, "0")}</p>
                <h2 className="mt-2 font-display text-4xl sm:text-5xl">{s.name}</h2>
                <p className="mt-5 max-w-xl leading-relaxed text-muted">{s.summary}</p>
                <ul className="mt-6 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  {s.includes.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-6 flex max-w-xl items-start gap-2 text-sm text-muted">
                  <Clapperboard className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                  <span>
                    <span className="text-paper">Deliverables:</span> {s.deliverables}
                  </span>
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <LinkButton href={`/booking?service=${s.slug}`}>Request this service</LinkButton>
                  <Suspense fallback={null}>
                    <WhatsAppLink message={`Hi {business}, I'd like to book ${s.name}. My date is: `} />
                  </Suspense>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Container>

      <section id="pricing" className="scroll-mt-28 border-t border-line bg-charcoal py-20 sm:py-28" aria-labelledby="pricing-title">
        <Container className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:items-start">
          <div id="pricing-title">
            <SectionHeading
              eyebrow="Pricing"
              title="Simple per-reel pricing"
              intro="The same packages apply to every service. Your final quote is confirmed with you before the shoot."
            />
            <LinkButton href="/booking" className="mt-8">
              Book a shoot
            </LinkButton>
          </div>
          <RegularPricing />
        </Container>
      </section>
    </>
  );
}
