import { CalendarCheck, MessageCircle } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getSiteInfo } from "@/lib/data/public";
import { whatsappLink } from "@/lib/utils/format";

async function WhatsAppButton() {
  await connection();
  const info = await getSiteInfo();
  const href = whatsappLink(info.whatsapp, `Hi ${info.businessName}, I'd like to book a shoot. My date is: `);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="grid size-12 shrink-0 place-items-center rounded-full border border-line-strong bg-panel text-paper"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="size-5" aria-hidden />
    </a>
  );
}

/** Always-visible booking action on small screens. */
export function MobileBookingBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/90 p-3 backdrop-blur-md md:hidden">
      <div className="flex items-center gap-3">
        <Link
          href="/booking"
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-gold text-sm font-semibold uppercase tracking-[0.16em] text-ink"
        >
          <CalendarCheck className="size-4" aria-hidden />
          Book a Session
        </Link>
        <Suspense fallback={null}>
          <WhatsAppButton />
        </Suspense>
      </div>
    </div>
  );
}

async function FloatingWhatsApp() {
  await connection();
  const info = await getSiteInfo();
  const href = whatsappLink(info.whatsapp, `Hi ${info.businessName}, I'd like to book a shoot. My date is: `);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed right-6 bottom-6 z-40 hidden items-center gap-2 rounded-full bg-[#25D366] px-5 py-3.5 text-sm font-semibold text-ink shadow-lg shadow-black/40 transition-transform hover:-translate-y-0.5 md:flex"
    >
      <MessageCircle className="size-5" aria-hidden />
      Book on WhatsApp
    </a>
  );
}

/** Floating WhatsApp button on tablets and desktops (phones use the bottom bar). */
export function DesktopWhatsAppButton() {
  return (
    <Suspense fallback={null}>
      <FloatingWhatsApp />
    </Suspense>
  );
}
