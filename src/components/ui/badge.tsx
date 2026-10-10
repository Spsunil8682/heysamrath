import type { BookingStatus } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";

const statusTone: Record<BookingStatus, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  confirmed: "bg-success/15 text-success border-success/30",
  rejected: "bg-danger/10 text-danger border-danger/30",
  cancelled: "bg-white/5 text-muted border-line-strong",
  completed: "bg-info/15 text-info border-info/30",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize", statusTone[status])}>
      {status}
    </span>
  );
}

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] uppercase tracking-wider text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
