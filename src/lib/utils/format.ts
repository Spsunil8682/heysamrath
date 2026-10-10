import { siteConfig } from "@/lib/config/site";

export function formatPrice(amount: number | null, currency: string, starting = false): string {
  if (amount === null) return "Price on request";
  const value = new Intl.NumberFormat(siteConfig.locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
  return starting ? `From ${value}` : value;
}

export function formatDuration(minutes: number): string {
  if (minutes >= 600) return "Full day";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** "2026-10-21" → "Wed, 21 Oct 2026" without any time-zone shifting. */
export function formatDateOnly(date: string, opts: Intl.DateTimeFormatOptions = {}): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(siteConfig.locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
    ...opts,
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "14:30:00" → "2:30 pm" */
export function formatTime(time: string | null | undefined): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatDateTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat(siteConfig.locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}

export function whatsappLink(number: string | null | undefined, text?: string): string | null {
  const digits = (number ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
