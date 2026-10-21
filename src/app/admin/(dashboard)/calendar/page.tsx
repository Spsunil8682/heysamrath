import type { Metadata } from "next";
import Link from "next/link";
import { deleteBlock } from "@/app/admin/_actions/availability";
import { ActionButton } from "@/components/admin/action-button";
import { BlockForm } from "@/components/admin/block-form";
import { ErrorState } from "@/components/ui/states";
import { requireAdmin } from "@/lib/auth/admin";
import { monthGrid, monthLabel, shiftMonth } from "@/lib/booking/calendar";
import { getAllServices, getBusinessToday } from "@/lib/data/admin";
import { cn } from "@/lib/utils/cn";
import { formatDateOnly, formatTime } from "@/lib/utils/format";

/** Admin pages wait for the server-side login check; they are not meant to render instantly. */
export const instant = false;

export const metadata: Metadata = { title: "Calendar" };

type Supabase = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

async function loadCalendar(supabase: Supabase, monthParam: unknown) {
  const { today } = await getBusinessToday(supabase);
  const month = typeof monthParam === "string" && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : today.slice(0, 7);
  const grid = monthGrid(month);
  const [services, b, bl] = await Promise.all([
    getAllServices(supabase),
    supabase
      .from("bookings")
      .select("id,booking_reference,customer_name,event_date,start_time,end_time,status,service_id")
      .in("status", ["confirmed", "pending"])
      .gte("event_date", grid.days[0])
      .lte("event_date", grid.days[41])
      .order("starts_at"),
    supabase.from("availability_blocks").select("*").gte("end_date", today).order("start_date").limit(100),
  ]);
  if (b.error || bl.error) throw b.error ?? bl.error;
  return { today, month, grid, services, bookings: b.data, blocks: bl.data };
}

export default async function AdminCalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const data = await loadCalendar(supabase, sp.month).catch(() => null);
  if (!data) return <ErrorState title="Calendar unavailable" />;
  const { today, month, grid, services, bookings, blocks } = data;

  const serviceName = new Map(services.map((x) => [x.id, x.name]));
  const byDate = new Map<string, typeof bookings>();
  for (const bk of bookings) byDate.set(bk.event_date, [...(byDate.get(bk.event_date) ?? []), bk]);
  const blockedOn = (d: string) => blocks.filter((x) => x.start_date <= d && x.end_date >= d);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl">Calendar</h1>
        <nav aria-label="Month" className="flex items-center gap-3">
          <Link href={`/admin/calendar?month=${shiftMonth(month, -1)}`} className="rounded-full border border-line-strong px-3 py-1.5 text-sm hover:border-gold">
            ←
          </Link>
          <span className="min-w-36 text-center font-display text-xl">{monthLabel(month)}</span>
          <Link href={`/admin/calendar?month=${shiftMonth(month, 1)}`} className="rounded-full border border-line-strong px-3 py-1.5 text-sm hover:border-gold">
            →
          </Link>
        </nav>
      </header>

      <div className="grid gap-8 2xl:grid-cols-[1fr_22rem]">
        <div className="overflow-x-auto">
          <div className="grid min-w-[52rem] grid-cols-7 gap-px overflow-hidden rounded-2xl border border-line bg-line">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="bg-panel px-2 py-2 text-center text-[10px] uppercase tracking-widest text-subtle">
                {d}
              </div>
            ))}
            {grid.days.map((d) => {
              const inMonth = d >= grid.firstOfMonth && d <= grid.lastOfMonth;
              const dayBookings = byDate.get(d) ?? [];
              const dayBlocks = blockedOn(d);
              return (
                <div key={d} className={cn("min-h-28 bg-charcoal p-2", !inMonth && "opacity-40", d === today && "ring-1 ring-inset ring-gold")}>
                  <p className="text-xs tabular-nums text-muted">{Number(d.slice(8))}</p>
                  <ul className="mt-1 space-y-1">
                    {dayBlocks.map((x) => (
                      <li key={x.id} className="truncate rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-muted" title={x.reason ?? "Blocked"}>
                        ⛔ {x.start_time ? `${x.start_time.slice(0, 5)}–${x.end_time?.slice(0, 5)}` : "Blocked"}
                      </li>
                    ))}
                    {dayBookings.map((bk) => (
                      <li key={bk.id}>
                        <Link
                          href={`/admin/bookings/${bk.id}`}
                          className={cn(
                            "block truncate rounded px-1.5 py-0.5 text-[11px]",
                            bk.status === "confirmed" ? "bg-success/20 text-paper" : "border border-dashed border-warning/60 text-warning",
                          )}
                          title={`${bk.booking_reference} · ${serviceName.get(bk.service_id)}`}
                        >
                          {bk.start_time ? `${bk.start_time.slice(0, 5)} ` : ""}
                          {bk.customer_name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-subtle">
            Solid = confirmed · dashed = pending request (does not hold the date) · ⛔ = blocked
          </p>
        </div>

        <aside className="space-y-8">
          <section className="rounded-2xl border border-line bg-panel p-6" aria-labelledby="block-title">
            <h2 id="block-title" className="font-display text-2xl">Block time</h2>
            <p className="mt-1 text-xs text-muted">Blocks that overlap confirmed bookings are refused.</p>
            <div className="mt-5">
              <BlockForm today={today} />
            </div>
          </section>
          <section className="rounded-2xl border border-line bg-panel p-6" aria-labelledby="blocks-title">
            <h2 id="blocks-title" className="font-display text-2xl">Upcoming blocks</h2>
            {blocks.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No blocked dates.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {blocks.map((x) => (
                  <li key={x.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                    <span>
                      {formatDateOnly(x.start_date)}
                      {x.end_date !== x.start_date && ` – ${formatDateOnly(x.end_date)}`}
                      {x.start_time && (
                        <span className="block text-xs text-muted">
                          {formatTime(x.start_time)} – {formatTime(x.end_time)}
                        </span>
                      )}
                      {x.reason && <span className="block text-xs text-subtle">{x.reason}</span>}
                    </span>
                    <ActionButton
                      variant="ghost"
                      action={deleteBlock.bind(null, x.id)}
                      ariaLabel="Remove block"
                      confirm={{ title: "Remove this block?", body: "These dates become available for booking again.", confirmLabel: "Remove" }}
                    >
                      Remove
                    </ActionButton>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
