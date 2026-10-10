import { Camera, Globe, Mail, MapPin, MessageCircle, Phone, PlaySquare, Users, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { navigation, siteConfig } from "@/lib/config/site";
import { getSiteInfo } from "@/lib/data/public";
import { whatsappLink } from "@/lib/utils/format";

const socialIcons: Record<string, typeof Globe> = { instagram: Camera, youtube: PlaySquare, facebook: Users };

async function FooterContact() {
  await connection();
  const info = await getSiteInfo();
  const wa = whatsappLink(info.whatsapp);
  const items = [
    info.email && { icon: Mail, label: info.email, href: `mailto:${info.email}` },
    info.phone && { icon: Phone, label: info.phone, href: `tel:${info.phone.replace(/[^\d+]/g, "")}` },
    wa && { icon: MessageCircle, label: "WhatsApp", href: wa },
    info.address && { icon: MapPin, label: info.address },
  ].filter(Boolean) as { icon: typeof Mail; label: string; href?: string }[];

  return (
    <div className="space-y-6">
      {items.length > 0 ? (
        <ul className="space-y-3 text-sm text-muted">
          {items.map(({ icon: Icon, label, href }) => (
            <li key={label} className="flex items-start gap-3">
              <Icon className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
              {href ? (
                <a href={href} className="hover:text-paper" {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                  {label}
                </a>
              ) : (
                <span>{label}</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          <Link href="/contact" className="underline decoration-gold/50 underline-offset-4 hover:text-paper">
            Send us a message
          </Link>
        </p>
      )}
      {Object.keys(info.social).length > 0 && (
        <ul className="flex gap-3" aria-label="Social media">
          {Object.entries(info.social).map(([name, url]) => {
            const Icon = socialIcons[name] ?? LinkIcon;
            return (
              <li key={name}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={name}
                  className="grid size-10 place-items-center rounded-full border border-line-strong text-muted transition-colors hover:border-gold hover:text-gold"
                >
                  <Icon className="size-4" aria-hidden />
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

async function FooterName() {
  await connection();
  const info = await getSiteInfo();
  return <>{info.businessName}</>;
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-charcoal pb-28 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-3">
        <div>
          <p className="font-display text-3xl">
            <Suspense fallback={siteConfig.businessName}>
              <FooterName />
            </Suspense>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">{siteConfig.description}</p>
        </div>
        <nav aria-label="Footer">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">Explore</p>
          <ul className="mt-4 space-y-2 text-sm">
            {[...navigation, { href: "/booking", label: "Book a Session" }, { href: "/privacy", label: "Privacy" }].map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="text-muted hover:text-paper">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">Get in touch</p>
          <div className="mt-4">
            <Suspense fallback={<div className="h-24" />}>
              <FooterContact />
            </Suspense>
          </div>
        </div>
      </div>
      <div className="border-t border-line py-6 text-center text-xs text-subtle">
        © <Suspense fallback={null}><Year /></Suspense>{" "}
        <Suspense fallback={siteConfig.businessName}>
          <FooterName />
        </Suspense>
        . All rights reserved.
      </div>
    </footer>
  );
}

async function Year() {
  "use cache";
  return <>{new Date().getFullYear()}</>;
}
