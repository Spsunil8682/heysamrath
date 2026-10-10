import { ArrowRight, CalendarPlus, ImagePlus, Settings } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import { requireAdmin } from "@/lib/auth/admin";
import { getAllServices, getBusinessToday } from "@/lib/data/admin";
import type { BookingStatus } from "@/lib/types/database";
import { formatDateOnly, formatDateTime, formatTime } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Overview" };

const STATUSES: BookingStatus[] = ["pending", "confirmed", "cancelled", "rejected", "completed"];

type Supabase = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

async function loadOverview(supabase: Supabase) {
  const { today, timezone } = await getBusinessToday(supabase);
  const [counts, total, upcoming, activity, services, unread] = await Promise.all([
    Promise.all(
      STATUSES.map(async (s) => {
        const { count, error } = await supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", s);
        if (error) throw error;
        return [s, count ?? 0] as const;
      }),
    ),
    supabase.from("bookings").select("id", { count: "exact", head: true }),
    supabase
      .from("bookings")
      .select("id,booking_reference,customer_name,event_date,start_time,service_id,location")
      .eq("status", "confirmed")
      .gte("event_date", today)
      .order("starts_at")
      .limit(6),
    supabase.from("booking_events").select("id,booking_id,event_type,from_status,to_status,created_at").order("created_at", { ascending: false }).limit(8),
    getAllServices(supabase),
    supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("handled", false),
  ]);
  for (const r of [total, upcoming, activity, unread]) if (r.error) throw r.error;

  const byStatus = Object.fromEntries(counts) as Record<BookingStatus, number>;
  const serviceName = new Map(services.map((s) => [s.id, s.name]));
  const activityIds = [...new Set((activity.data ?? []).map((a) => a.booking_id))];
  const { data: activityBookings } = activityIds.length
    ? await supabase.from("bookings").select("id,booking_reference,customer_name").in("id", activityIds)
    : { data: [] };
  const bookingById = new Map((activityBookings ?? []).map((b) => [b.id, b]));

  return {
    today,
    timezone,
    byStatus,
    total,
    upcoming: upcoming.data!,
    activity: activity.data!,
    unreadCount: unread.count ?? 0,
    serviceName,
    bookingById,
  };
}

export default async function AdminOverview() {
  const { supabase } = await requireAdmin();

  const data = await loadOverview(supabase).catch(() => null);
  if (!data) {
    return <ErrorState title="Dashboard unavailable">The database could not be reached. No figures are shown rather than showing wrong ones.</ErrorState>;
  }
  const { today, timezone, byStatus, total, upcoming, activity, unreadCount, serviceName, bookingById } = data;

  const stats = [
    { label: "Total requests", value: total.count ?? 0, href: "/admin/bookings" },
    { label: "Pending", value: byStatus.pending, href: "/admin/bookings?status=pending", highlight: byStatus.pending > 0 },
    { label: "Confirmed", value: byStatus.confirmed, href: "/admin/bookings?status=confirmed" },
    { label: "Cancelled", value: byStatus.cancelled, href: "/admin/bookings?status=cancelled" },
  ];

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Overview</h1>
          <p className="mt-1 text-sm text-muted">
            Today is {formatDateOnly(today)} ({timezone})
          </p>
        </div>
        {byStatus.pending > 0 && (
          <LinkButton href="/admin/bookings?status=pending">
            Review {byStatus.pending} pending {byStatus.pending === 1 ? "request" : "requests"}
          </LinkButton>
        )}
      </header>

      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className={`rounded-2xl border p-5 transition-colors hover:border-gold ${s.highlight ? "border-warning/50 bg-warning/5" : "border-line bg-panel"}`}
          >
            <dt className="text-xs uppercase tracking-[0.16em] text-muted">{s.label}</dt>
            <dd className="mt-3 font-display text-4xl tabular-nums">{s.value}</dd>
          </Link>
        ))}
      </dl>

      <div className="grid gap-8 xl:grid-cols-2">
        <section className="rounded-2xl border border-line bg-panel p-6" aria-labelledby="upcoming">
          <div className="flex items-center justify-between">
            <h2 id="upcoming" className="font-display text-2xl">Upcoming events</h2>
            <Link href="/admin/calendar" className="text-xs text-gold hover:text-gold-bright">Calendar →</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="mt-6 text-sm text-muted">No confirmed upcoming events.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {upcoming.map((b) => (
                <li key={b.id}>
                  <Link href={`/admin/bookings/${b.id}`} className="flex items-center justify-between gap-4 py-3 hover:text-gold-bright">
                    <span>
                      <span className="block text-sm font-medium">{b.customer_name}</span>
                      <span className="block text-xs text-muted">
                        {serviceName.get(b.service_id)} · {b.location}
                      </span>
                    </span>
                    <span className="text-right text-xs text-muted">
                      {formatDateOnly(b.event_date)}
                      {b.start_time && <span className="block">{formatTime(b.start_time)}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-panel p-6" aria-labelledby="activity">
          <h2 id="activity" className="font-display text-2xl">Recent activity</h2>
          {activity.length === 0 ? (
            <p className="mt-6 text-sm text-muted">No booking activity yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {activity.map((a) => {
                const b = bookingById.get(a.booking_id);
                return (
                  <li key={a.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <Link href={`/admin/bookings/${a.booking_id}`} className="min-w-0 hover:text-gold-bright">
                      <span className="font-mono text-xs text-gold">{b?.booking_reference}</span>{" "}
                      <span className="text-muted">
                        {a.event_type === "created" ? "New request from" : a.event_type === "updated" ? "Edited:" : "Status →"}
                      </span>{" "}
                      {a.event_type === "status_changed" && a.to_status ? <StatusBadge status={a.to_status} /> : b?.customer_name}
                    </Link>
                    <span className="shrink-0 text-xs text-subtle">{formatDateTime(a.created_at, timezone)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="quick">
        <h2 id="quick" className="font-display text-2xl">Quick actions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/admin/calendar", label: "Block dates", icon: CalendarPlus },
            { href: "/admin/portfolio/new", label: "Add portfolio item", icon: ImagePlus },
            { href: "/admin/messages", label: `Messages${unreadCount > 0 ? ` (${unreadCount} new)` : ""}`, icon: ArrowRight },
            { href: "/admin/settings", label: "Business settings", icon: Settings },
          ].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-3 rounded-xl border border-line bg-panel p-4 text-sm hover:border-gold">
              <Icon className="size-4 text-gold" aria-hidden />
              {label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
