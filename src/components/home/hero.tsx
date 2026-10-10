import Image from "next/image";
import { connection } from "next/server";
import { Suspense } from "react";
import { LinkButton } from "@/components/ui/button";
import { siteConfig } from "@/lib/config/site";
import { heroClips } from "@/lib/data/local-media";
import { getSiteInfo } from "@/lib/data/public";
import { HeroVideoRotator } from "./hero-video-rotator";

async function LiveTitle() {
  await connection();
  const info = await getSiteInfo();
  return (
    <>
      <span className="sr-only">{info.businessName} — </span>
      {info.tagline}
    </>
  );
}

export function Hero() {
  const clips = siteConfig.heroBackground === "videos" ? heroClips() : [];
  return (
    <section className="grain relative flex min-h-[100svh] items-end overflow-hidden" aria-labelledby="hero-title">
      <div className="absolute inset-0 animate-slow-zoom">
        <Image
          src={siteConfig.images.hero}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <HeroVideoRotator clips={clips} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/30" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-transparent to-transparent" aria-hidden />

      <div className="relative mx-auto w-full max-w-7xl px-5 pb-28 sm:px-8 sm:pb-32">
        <p className="flex animate-fade-up items-center gap-x-2.5 text-[10px] font-semibold tracking-[0.22em] whitespace-nowrap text-gold uppercase sm:gap-x-4 sm:text-[11px] sm:tracking-[0.4em]">
          <span>Videography</span>
          <span aria-hidden>·</span>
          <span>Photography</span>
          <span aria-hidden>·</span>
          <span>Editing</span>
        </p>
        <h1
          id="hero-title"
          className="mt-6 max-w-4xl animate-fade-up font-display text-5xl leading-[0.98] font-medium text-balance [animation-delay:120ms] sm:text-7xl lg:text-8xl"
        >
          <Suspense fallback={siteConfig.tagline}>
            <LiveTitle />
          </Suspense>
        </h1>
        <div className="mt-10 flex animate-fade-up flex-wrap gap-4 [animation-delay:240ms]">
          <LinkButton href="/booking" size="lg">
            Book a Session
          </LinkButton>
          <LinkButton href="/portfolio" variant="secondary" size="lg" className="bg-black/20 backdrop-blur-sm">
            Explore Portfolio
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
