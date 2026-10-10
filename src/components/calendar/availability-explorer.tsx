"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { todayIn } from "@/lib/booking/calendar";
import { BOOKABLE_STATUSES } from "@/lib/booking/slots";
import type { AvailabilityDay } from "@/lib/types/availability";
import { formatDateOnly, formatTime } from "@/lib/utils/format";
import { AvailabilityCalendar, statusMeta } from "./availability-calendar";
import { useAvailability } from "./use-availability";

export function AvailabilityExplorer({ timezone }: { timezone: string }) {
  const [month, setMonth] = useState(() => todayIn(timezone).slice(0, 7));
  const availability = useAvailability(month);
  const [day, setDay] = useState<AvailabilityDay | null>(null);
  const current = day ? (availability.data?.days.find((d) => d.date === day.date) ?? day) : null;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <AvailabilityCalendar
        month={month}
        onMonthChange={setMonth}
        data={availability.data}
        loading={availability.status === "loading"}
        error={availability.status === "error" ? availability.message : undefined}
        onRetry={availability.reload}
        selected={current?.date}
        onSelect={setDay}
      />
      <div className="rounded-2xl border border-line bg-panel p-6" aria-live="polite">
        {!current ? (
          <p className="text-muted">Select a date to see its details.</p>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gold">{statusMeta[current.status].label}</p>
              <h3 className="mt-2 font-display text-3xl">{formatDateOnly(current.date)}</h3>
            </div>
            {current.open && current.close && !["past", "closed", "unavailable"].includes(current.status) && (
              <p className="text-sm text-muted">
                Working hours: {formatTime(current.open)} – {formatTime(current.close)}
              </p>
            )}
            {current.busy.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Unavailable times</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {current.busy.map((b, i) => (
                    <li key={i} className="flex justify-between border-b border-line py-1.5">
                      <span>
                        {formatTime(b.start)} – {b.end === "24:00" ? "midnight" : formatTime(b.end)}
                      </span>
                      <span className="text-subtle">{b.kind === "booked" ? "Booked" : "Unavailable"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {BOOKABLE_STATUSES.has(current.status) ? (
              <Link href="/booking" className={buttonClass("primary")}>
                Request this date
              </Link>
            ) : (
              <p className="text-sm text-muted">This date can&apos;t be booked. Please choose another.</p>
            )}
          </div>
        )}
        <p className="mt-8 border-t border-line pt-4 text-xs text-subtle">
          Pending requests don&apos;t hold a date. A date is only reserved once we confirm your booking.
        </p>
      </div>
    </div>
  );
}
