import { Camera, Globe, Mail, MapPin, MessageCircle, Phone, PlaySquare, Users, Link as LinkIcon } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ContactForm } from "@/components/contact-form";
import { buttonClass } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/states";
import { getSiteInfo } from "@/lib/data/public";
import { whatsappLink } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch about your wedding, event, brand film or editing project.",
  alternates: { canonical: "/contact" },
};

const socialIcons: Record<string, typeof Globe> = { instagram: Camera, youtube: PlaySquare, facebook: Users };

async function ContactDetails() {
  await connection();
  const info = await getSiteInfo();
  const wa = whatsappLink(info.whatsapp, `Hi ${info.businessName}, I have a question.`);
  const rows = [
    info.email && { icon: Mail, label: "Email", value: info.email, href: `mailto:${info.email}` },
    info.phone && { icon: Phone, label: "Phone", value: info.phone, href: `tel:${info.phone.replace(/[^\d+]/g, "")}` },
    info.address && { icon: MapPin, label: "Based in", value: info.address },
  ].filter(Boolean) as { icon: typeof Mail; label: string; value: string; href?: string }[];

  return (
    <div className="space-y-8">
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "lg", "w-full sm:w-auto")}>
          <MessageCircle className="size-5" aria-hidden /> Chat on WhatsApp
        </a>
      )}
      {rows.length > 0 && (
        <dl className="space-y-5">
          {rows.map(({ icon: Icon, label, value, href }) => (
            <div key={label} className="flex gap-4">
              <Icon className="mt-1 size-5 shrink-0 text-gold" aria-hidden />
              <div>
                <dt className="text-xs uppercase tracking-[0.2em] text-subtle">{label}</dt>
                <dd className="mt-1">
                  {href ? (
                    <a href={href} className="hover:text-gold-bright">
                      {value}
                    </a>
                  ) : (
                    value
                  )}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      )}
      {Object.keys(info.social).length > 0 && (
        <ul className="flex flex-wrap gap-3" aria-label="Social media">
          {Object.entries(info.social).map(([name, url]) => {
            const Icon = socialIcons[name] ?? LinkIcon;
            return (
              <li key={name}>
                <a href={url} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "sm", "capitalize")}>
                  <Icon className="size-4" aria-hidden /> {name}
                </a>
              </li>
            );
          })}
        </ul>
      )}
      {!wa && rows.length === 0 && <p className="text-muted">Use the form and we&apos;ll get back to you.</p>}
    </div>
  );
}

export default function ContactPage() {
  return (
    <>
      <PageHeader eyebrow="Contact" title="Let's talk about your project" intro="Questions, quotes or ideas: send a message and we'll reply personally." />
      <Container className="grid gap-14 py-14 sm:py-20 lg:grid-cols-[1fr_1.4fr]">
        <Suspense fallback={<Skeleton className="h-64" />}>
          <ContactDetails />
        </Suspense>
        <ContactForm />
      </Container>
    </>
  );
}
