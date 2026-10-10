"use client";

import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { monthGrid, monthLabel, shiftMonth } from "@/lib/booking/calendar";
import { BOOKABLE_STATUSES } from "@/lib/booking/slots";
import type { AvailabilityDay, AvailabilityResponse, DayStatus } from "@/lib/types/availability";
import { cn } from "@/lib/utils/cn";
import { formatDateOnly } from "@/lib/utils/format";

export const statusMeta: Record<DayStatus, { label: string; cell: string; dot: string }> = {
  available: { label: "Available", cell: "border-success/40 text-paper hover:border-success", dot: "bg-success" },
  limited: { label: "Partly booked", cell: "border-warning/50 text-paper hover:border-warning", dot: "bg-warning" },
  booked: { label: "Fully booked", cell: "border-transparent bg-danger/10 text-danger/80 line-through", dot: "bg-danger" },
  blocked: { label: "Unavailable", cell: "border-transparent bg-white/5 text-subtle", dot: "bg-subtle" },
  closed: { label: "Closed", cell: "border-transparent text-subtle/70", dot: "bg-subtle/50" },
  past: { label: "Past", cell: "border-transparent text-subtle/40", dot: "bg-transparent" },
  unavailable: { label: "Not yet open", cell: "border-transparent text-subtle/50", dot: "bg-transparent" },
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function AvailabilityCalendar({
  month,
  onMonthChange,
  data,
  loading,
  error,
  onRetry,
  selected,
  onSelect,
  selectableOnly = false,
}: {
  month: string;
  onMonthChange: (m: string) => void;
  data: AvailabilityResponse | null;
  loading: boolean;
  error?: string;
  onRetry?: () => void;
  selected?: string | null;
  onSelect?: (day: AvailabilityDay) => void;
  selectableOnly?: boolean;
}) {
  const { days, firstOfMonth, lastOfMonth } = monthGrid(month);
  const byDate = new Map(data?.days.map((d) => [d.date, d]));
  const thisMonth = data?.today.slice(0, 7);
  const canGoBack = !thisMonth || month > thisMonth;

  return (
    <div className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(month, -1))}
          disabled={!canGoBack}
          className="rounded-full p-2 text-muted hover:bg-white/5 hover:text-paper disabled:opacity-30"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <h3 className="font-display text-2xl" aria-live="polite">
          {monthLabel(month)}
        </h3>
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
          className="rounded-full p-2 text-muted hover:bg-white/5 hover:text-paper"
          aria-label="Next month"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>

      {error && (
        <div role="alert" className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm">
          <span>{error}</span>
          {onRetry && (
            <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 text-gold hover:text-gold-bright">
              <RefreshCw className="size-3.5" aria-hidden /> Retry
            </button>
          )}
        </div>
      )}

      <div className="mt-5 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-widest text-subtle" aria-hidden>
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className={cn("mt-1 grid grid-cols-7 gap-1 transition-opacity", loading && "opacity-50")} aria-busy={loading}>
        {days.map((date) => {
          const inMonth = date >= firstOfMonth && date <= lastOfMonth;
          const day = byDate.get(date);
          const meta = day ? statusMeta[day.status] : null;
          const bookable = day ? BOOKABLE_STATUSES.has(day.status) : false;
          const disabled = !day || !onSelect || (selectableOnly && !bookable);
          const isSelected = selected === date;
          return (
            <button
              key={date}
              type="button"
              disabled={disabled}
              onClick={() => day && onSelect?.(day)}
              aria-pressed={onSelect ? isSelected : undefined}
              aria-label={`${formatDateOnly(date, { year: undefined })}: ${meta?.label ?? "Loading"}`}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-lg border text-sm tabular-nums transition-colors",
                !inMonth && "opacity-35",
                meta?.cell ?? "border-transparent text-subtle",
                isSelected && "!border-gold bg-gold !text-ink",
                disabled && "cursor-default",
              )}
            >
              {Number(date.slice(8))}
              {meta && <span className={cn("absolute bottom-1.5 size-1 rounded-full", isSelected ? "bg-ink" : meta.dot)} aria-hidden />}
            </button>
          );
        })}
      </div>

      <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
        {(["available", "limited", "booked", "blocked", "closed"] as const).map((s) => (
          <li key={s} className="flex items-center gap-2">
            <span className={cn("size-2 rounded-full", statusMeta[s].dot)} aria-hidden />
            {statusMeta[s].label}
          </li>
        ))}
      </ul>
      {data && <p className="mt-3 text-xs text-subtle">All times are in {data.timezone.replace("_", " ")} time.</p>}
    </div>
  );
}
