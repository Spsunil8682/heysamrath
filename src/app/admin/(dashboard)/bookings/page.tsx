import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { requireAdmin } from "@/lib/auth/admin";
import { getAllServices } from "@/lib/data/admin";
import type { BookingStatus } from "@/lib/types/database";
import { formatDateOnly, formatTime } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Bookings" };

const STATUSES: BookingStatus[] = ["pending", "confirmed", "rejected", "cancelled", "completed"];
const PAGE_SIZE = 25;

type SP = Record<string, string | string[] | undefined>;
const str = (v: unknown) => (typeof v === "string" ? v : "");

export default async function BookingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const q = str(sp.q).trim().slice(0, 80);
  const status = STATUSES.includes(str(sp.status) as BookingStatus) ? (str(sp.status) as BookingStatus) : "";
  const service = /^[0-9a-f-]{36}$/i.test(str(sp.service)) ? str(sp.service) : "";
  const from = /^\d{4}-\d{2}-\d{2}$/.test(str(sp.from)) ? str(sp.from) : "";
  const to = /^\d{4}-\d{2}-\d{2}$/.test(str(sp.to)) ? str(sp.to) : "";
  const page = Math.max(1, Number.parseInt(str(sp.page) || "1", 10) || 1);

  let services, result;
  try {
    services = await getAllServices(supabase);
    let query = supabase
      .from("bookings")
      .select("id,booking_reference,customer_name,email,phone,service_id,event_date,start_time,end_time,status,created_at", {
        count: "exact",
      })
      .order("event_date", { ascending: status === "pending" || status === "confirmed" })
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    if (status) query = query.eq("status", status);
    if (service) query = query.eq("service_id", service);
    if (from) query = query.gte("event_date", from);
    if (to) query = query.lte("event_date", to);
    if (q) {
      // Strip characters that have meaning in PostgREST filter syntax.
      const safe = q.replace(/[%,()*\\:."']/g, " ").trim();
      if (safe) query = query.or(`customer_name.ilike.*${safe}*,booking_reference.ilike.*${safe}*,email.ilike.*${safe}*`);
    }
    result = await query;
    if (result.error) throw result.error;
  } catch {
    return <ErrorState title="Bookings unavailable" />;
  }

  const serviceName = new Map(services.map((s) => [s.id, s.name]));
  const total = result.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (p: number) => {
    const u = new URLSearchParams(Object.entries({ q, status, service, from, to }).filter(([, v]) => v) as [string, string][]);
    if (p > 1) u.set("page", String(p));
    return `/admin/bookings?${u}`;
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Bookings</h1>
          <p className="mt-1 text-sm text-muted">{total} matching</p>
        </div>
        <Link href="/admin/calendar" className={buttonClass("secondary", "sm")}>
          Calendar view
        </Link>
      </header>

      <form method="get" className="grid gap-3 rounded-2xl border border-line bg-panel p-4 sm:grid-cols-2 lg:grid-cols-6" role="search">
        <label className="sr-only" htmlFor="q">Search</label>
        <Input id="q" name="q" defaultValue={q} placeholder="Name, email or reference" className="lg:col-span-2" />
        <label className="sr-only" htmlFor="status">Status</label>
        <Select id="status" name="status" defaultValue={status}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s}
            </option>
          ))}
        </Select>
        <label className="sr-only" htmlFor="service">Service</label>
        <Select id="service" name="service" defaultValue={service}>
          <option value="">All services</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-2 lg:col-span-2">
          <label className="sr-only" htmlFor="from">From date</label>
          <Input id="from" name="from" type="date" defaultValue={from} aria-label="From date" />
          <label className="sr-only" htmlFor="to">To date</label>
          <Input id="to" name="to" type="date" defaultValue={to} aria-label="To date" />
        </div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
          <button type="submit" className={buttonClass("primary", "sm")}>
            Apply filters
          </button>
          <Link href="/admin/bookings" className={buttonClass("ghost", "sm")}>
            Reset
          </Link>
        </div>
      </form>

      {result.data.length === 0 ? (
        <EmptyState title="No bookings found">Try different filters.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="bg-panel text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Reference</th>
                <th scope="col" className="px-4 py-3">Customer</th>
                <th scope="col" className="px-4 py-3">Service</th>
                <th scope="col" className="px-4 py-3">Event</th>
                <th scope="col" className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {result.data.map((b) => (
                <tr key={b.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/bookings/${b.id}`} className="font-mono text-gold hover:text-gold-bright">
                      {b.booking_reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block">{b.customer_name}</span>
                    <span className="block text-xs text-muted">{b.email}</span>
                  </td>
                  <td className="px-4 py-3 text-muted">{serviceName.get(b.service_id)}</td>
                  <td className="px-4 py-3">
                    {formatDateOnly(b.event_date)}
                    {b.start_time && (
                      <span className="block text-xs text-muted">
                        {formatTime(b.start_time)} – {formatTime(b.end_time)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-3">
          {page > 1 && <Link href={pageHref(page - 1)} className={buttonClass("secondary", "sm")}>Previous</Link>}
          <span className="text-sm text-muted">Page {page} of {pages}</span>
          {page < pages && <Link href={pageHref(page + 1)} className={buttonClass("secondary", "sm")}>Next</Link>}
        </nav>
      )}
    </div>
  );
}
