import { Mail, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingActions } from "@/components/admin/booking-actions";
import { BookingEditForm } from "@/components/admin/booking-edit-form";
import { StatusBadge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/states";
import { requireAdmin } from "@/lib/auth/admin";
import { getAllServices, getBusinessToday } from "@/lib/data/admin";
import { formatDateOnly, formatDateTime, formatTime, whatsappLink } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Booking" };

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();

  let booking, events, services, tz;
  try {
    const [b, e, s, t] = await Promise.all([
      supabase.from("bookings").select("*").eq("id", id).maybeSingle(),
      supabase.from("booking_events").select("*").eq("booking_id", id).order("created_at", { ascending: false }),
      getAllServices(supabase),
      getBusinessToday(supabase),
    ]);
    if (b.error || e.error) throw b.error ?? e.error;
    booking = b.data;
    events = e.data;
    services = s;
    tz = t.timezone;
  } catch {
    return <ErrorState title="Booking unavailable" />;
  }
  if (!booking) notFound();
  const service = services.find((s) => s.id === booking.service_id);
  const wa = whatsappLink(booking.phone, `Hi ${booking.customer_name}, regarding your booking ${booking.booking_reference}`);

  return (
    <div className="space-y-8">
      <Link href="/admin/bookings" className="text-xs text-gold hover:text-gold-bright">
        ← All bookings
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-gold">{booking.booking_reference}</p>
          <h1 className="mt-1 font-display text-4xl">{booking.customer_name}</h1>
          <p className="mt-2 text-sm text-muted">
            {service?.name} · {formatDateOnly(booking.event_date)}
            {booking.start_time && ` · ${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}`}
          </p>
        </div>
        <StatusBadge status={booking.status} />
      </header>

      <section className="rounded-2xl border border-line bg-panel p-6" aria-labelledby="actions">
        <h2 id="actions" className="sr-only">Actions</h2>
        <BookingActions id={booking.id} reference={booking.booking_reference} status={booking.status} />
      </section>

      <div className="grid gap-8 xl:grid-cols-[1fr_20rem]">
        <section className="rounded-2xl border border-line bg-panel p-6" aria-labelledby="edit">
          <h2 id="edit" className="font-display text-2xl">Details</h2>
          <div className="mt-5">
            <BookingEditForm booking={booking} services={services.map(({ id, name }) => ({ id, name }))} />
          </div>
        </section>
        <aside className="space-y-6">
          <section className="rounded-2xl border border-line bg-panel p-6">
            <h2 className="font-display text-xl">Contact</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li><a className="flex items-center gap-2 hover:text-gold" href={`mailto:${booking.email}`}><Mail className="size-4 text-gold" aria-hidden />{booking.email}</a></li>
              <li><a className="flex items-center gap-2 hover:text-gold" href={`tel:${booking.phone.replace(/[^\d+]/g, "")}`}><Phone className="size-4 text-gold" aria-hidden />{booking.phone}</a></li>
              {wa && <li><a className="flex items-center gap-2 hover:text-gold" href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle className="size-4 text-gold" aria-hidden />WhatsApp</a></li>}
            </ul>
          </section>
          <section className="rounded-2xl border border-line bg-panel p-6">
            <h2 className="font-display text-xl">History</h2>
            <ol className="mt-4 space-y-3 text-sm">
              {events.map((e) => (
                <li key={e.id} className="border-l border-line-strong pl-3">
                  <span className="block">
                    {e.event_type === "created" ? "Request received" : e.event_type === "updated" ? "Details edited" : `Status: ${e.from_status} → ${e.to_status}`}
                  </span>
                  <span className="text-xs text-subtle">{formatDateTime(e.created_at, tz)}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-subtle">Consent given {formatDateTime(booking.consent_at, tz)}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
