import { Clapperboard, Film, MessagesSquare, Sparkles } from "lucide-react";
import Image from "next/image";
import { Suspense } from "react";
import { FeaturedWork, InstagramSpotlight } from "@/components/home/featured-work";
import { Hero } from "@/components/home/hero";
import { ServicesOverview } from "@/components/home/services-overview";
import { NavratriOffer } from "@/components/pricing/reel-pricing";
import { LinkButton } from "@/components/ui/button";
import { Container, Eyebrow, SectionHeading } from "@/components/ui/container";
import { GridSkeleton } from "@/components/ui/states";
import { siteConfig, testimonials } from "@/lib/config/site";

const process = [
  { icon: MessagesSquare, title: "Conversation", text: "Tell us about your day, your people and the feeling you want to remember." },
  { icon: Clapperboard, title: "Planning", text: "We agree on coverage, locations, timings and deliverables before the shoot." },
  { icon: Film, title: "The shoot", text: "Unobtrusive, story-first filming and photography that lets moments unfold naturally." },
  { icon: Sparkles, title: "Edit & delivery", text: "Careful editing, colour grading and sound design, delivered ready to share." },
];

export default function HomePage() {
  return (
    <>
      <Hero />

      <Suspense fallback={null}>
        <InstagramSpotlight
          heading={
            <div id="spotlight-title">
              <SectionHeading
                eyebrow="Most viewed on Instagram"
                title="Reels audiences can't stop watching"
                intro="Tap to watch here, or open the original reel on Instagram."
              />
            </div>
          }
        />
      </Suspense>

      <Suspense fallback={null}>
        <Container>
          <NavratriOffer className="mt-24 sm:mt-32" />
        </Container>
      </Suspense>

      <section className="py-24 sm:py-32" aria-labelledby="work-title">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div id="work-title">
              <SectionHeading eyebrow="Selected work" title="Stories told in light and motion" />
            </div>
            <LinkButton href="/portfolio" variant="secondary">
              View full portfolio
            </LinkButton>
          </div>
          <div className="mt-14">
            <Suspense fallback={<GridSkeleton />}>
              <FeaturedWork />
            </Suspense>
          </div>
        </Container>
      </section>

      <section className="border-y border-line bg-charcoal py-24 sm:py-32" aria-labelledby="services-title">
        <Container className="grid gap-14 lg:grid-cols-[1fr_1.4fr]">
          <div id="services-title" className="lg:sticky lg:top-32 lg:self-start">
            <SectionHeading
              eyebrow="Services"
              title="Reels for every kind of occasion"
              intro="Wedding functions, couples, models, salons, shops and festivals: cinematic vertical reels from ₹1,500 per reel, or just the edit if you already have footage."
            />
            <LinkButton href="/services" variant="secondary" className="mt-8">
              Explore services
            </LinkButton>
          </div>
          <ServicesOverview />
        </Container>
      </section>

      <section className="py-24 sm:py-32" aria-labelledby="about-title">
        <Container className="grid items-center gap-14 lg:grid-cols-2">
          <div className="relative grid grid-cols-5 gap-4">
            <div className="relative col-span-3 aspect-[3/4] overflow-hidden rounded-2xl">
              <Image
                src={siteConfig.images.about}
                alt="Samrath at the riverside at sunset"
                fill
                sizes="(min-width: 1024px) 30vw, 60vw"
                className="object-cover"
              />
            </div>
            <div className="relative col-span-2 mt-16 aspect-[3/4] overflow-hidden rounded-2xl">
              <Image
                src={siteConfig.images.aboutSecondary}
                alt="Samrath on an event stage between shoots"
                fill
                sizes="(min-width: 1024px) 20vw, 40vw"
                className="object-cover"
              />
            </div>
          </div>
          <div id="about-title">
            <SectionHeading
              eyebrow="About Me — Hey Samrath"
              title="Turning real moments into cinematic memories"
              intro="Hey, I'm Samrath — a passionate videographer and video editor who loves transforming ordinary moments into creative, cinematic, and eye-catching reels."
            />
            <p className="mt-5 max-w-xl leading-relaxed text-muted">
              From beautiful wedding functions and pre-wedding shoots to stylish model reels, Navratri celebrations, and
              business promotions, I focus on capturing the perfect moments and telling stories through video.
            </p>
            <LinkButton href="/about" variant="secondary" className="mt-8">
              More about me
            </LinkButton>
          </div>
        </Container>
      </section>

      <section className="border-t border-line bg-charcoal py-24 sm:py-32" aria-labelledby="process-title">
        <Container>
          <div id="process-title">
            <SectionHeading eyebrow="How it works" title="A calm, simple process" align="center" />
          </div>
          <ol className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {process.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="bg-charcoal p-8">
                <div className="flex items-center justify-between">
                  <Icon className="size-6 text-gold" aria-hidden />
                  <span className="font-display text-sm text-subtle">0{i + 1}</span>
                </div>
                <h3 className="mt-8 font-display text-2xl">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {testimonials.length > 0 && (
        <section className="py-24 sm:py-32" aria-labelledby="testimonials-title">
          <Container>
            <div id="testimonials-title">
              <SectionHeading eyebrow="Kind words" title="From our clients" align="center" />
            </div>
            <ul className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t) => (
                <li key={t.name} className="rounded-2xl border border-line bg-panel p-8">
                  <blockquote className="font-display text-xl leading-snug italic">“{t.quote}”</blockquote>
                  <p className="mt-6 text-sm text-gold">{t.name}</p>
                  {t.context && <p className="text-xs text-subtle">{t.context}</p>}
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      <section className="relative overflow-hidden py-28 sm:py-36" aria-labelledby="cta-title">
        <Image src="/media/images/cover-darshan.jpg" alt="" fill sizes="100vw" className="object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/70 to-ink" aria-hidden />
        <Container className="relative text-center">
          <Eyebrow>Let&apos;s create together</Eyebrow>
          <h2 id="cta-title" className="mx-auto mt-5 max-w-3xl font-display text-5xl leading-tight text-balance sm:text-6xl">
            Have a date in mind? Check availability and request your booking.
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <LinkButton href="/booking" size="lg">
              Book a Session
            </LinkButton>
            <LinkButton href="/availability" variant="secondary" size="lg">
              See availability
            </LinkButton>
          </div>
        </Container>
      </section>
    </>
  );
}
