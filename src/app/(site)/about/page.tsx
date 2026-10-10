import { Check, Heart } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { LinkButton } from "@/components/ui/button";
import { Container, Eyebrow, PageHeader, SectionHeading } from "@/components/ui/container";
import { siteConfig } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "About Me",
  description:
    "Hey, I'm Samrath: a videographer and video editor turning wedding functions, pre-wedding shoots, model reels, Navratri celebrations and business promotions into cinematic reels.",
  alternates: { canonical: "/about" },
};

const whatIDo = [
  "Wedding function reels: Haldi, Ganesh Pujan, Baraat, Reception, Phera, and more.",
  "Couple and pre-wedding reels.",
  "Model, fashion, and makeup artist reels.",
  "Navratri and Garba reels.",
  "Shop, brand, and business promotional reels.",
  "Event and celebration reels.",
  "Professional video editing using your existing footage.",
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About Me — Hey Samrath"
        title="Turning Real Moments Into Cinematic Memories."
      />

      <Container className="grid items-center gap-14 py-20 sm:py-28 lg:grid-cols-2">
        <div className="relative grid grid-cols-5 gap-4">
          <div className="relative col-span-3 aspect-[3/4] overflow-hidden rounded-2xl">
            <Image
              src={siteConfig.images.about}
              alt="Samrath at the riverside at sunset"
              fill
              priority
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
        <div className="space-y-5 text-lg leading-relaxed text-muted">
          <p className="font-display text-3xl leading-snug text-paper">
            Hey, I&apos;m Samrath — a passionate videographer and video editor who loves transforming ordinary moments
            into creative, cinematic, and eye-catching reels.
          </p>
          <p>
            From beautiful wedding functions and pre-wedding shoots to stylish model reels, Navratri celebrations, and
            business promotions, I focus on capturing the perfect moments and telling stories through video.
          </p>
          <p>
            My goal is to create reels that don&apos;t just look good but also capture emotions, showcase creativity,
            and leave a lasting impression. Whether you want to preserve your special memories, grow your business on
            social media, or create trendy Instagram content, I&apos;m here to bring your vision to life.
          </p>
        </div>
      </Container>

      <section className="border-y border-line bg-charcoal py-20 sm:py-28" aria-labelledby="what-i-do">
        <Container className="grid gap-14 lg:grid-cols-2">
          <div>
            <div id="what-i-do">
              <SectionHeading eyebrow="What I Do" title="Reels for every story" />
            </div>
            <ul className="mt-10 space-y-4">
              {whatIDo.map((item) => (
                <li key={item} className="flex items-start gap-3 text-muted">
                  <Check className="mt-1 size-5 shrink-0 text-gold" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <LinkButton href="/services" variant="secondary" className="mt-10">
              See services &amp; pricing
            </LinkButton>
          </div>
          <div className="self-start rounded-2xl border border-line bg-panel p-8 sm:p-10">
            <Heart className="size-7 text-gold" aria-hidden />
            <h2 className="mt-6 font-display text-4xl">My Promise</h2>
            <p className="mt-5 leading-relaxed text-muted">
              Every project gets my creativity, attention to detail, and dedication. I believe every moment has a story
              worth telling, and my job is to turn that story into a reel you&apos;ll love to watch and share.
            </p>
          </div>
        </Container>
      </section>

      <Container className="py-24 text-center sm:py-32">
        <Eyebrow>Let&apos;s create something amazing together!</Eyebrow>
        <h2 className="mx-auto mt-5 max-w-3xl font-display text-5xl leading-tight text-balance sm:text-6xl">
          Book your next reel with Hey Samrath and bring your ideas to life.
        </h2>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <LinkButton href="/booking" size="lg">
            Book your reel
          </LinkButton>
          <LinkButton href="/portfolio" variant="secondary" size="lg">
            See my work
          </LinkButton>
        </div>
      </Container>
    </>
  );
}
