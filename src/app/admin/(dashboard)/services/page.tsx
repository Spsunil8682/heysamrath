import type { Metadata } from "next";
import { deleteService, moveService } from "@/app/admin/_actions/services";
import { ActionButton } from "@/components/admin/action-button";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { requireAdmin } from "@/lib/auth/admin";
import { getAllServices } from "@/lib/data/admin";
import { formatDuration, formatPrice } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Services" };

export default async function AdminServicesPage() {
  const { supabase } = await requireAdmin();
  let services;
  try {
    services = await getAllServices(supabase);
  } catch {
    return <ErrorState title="Services unavailable" />;
  }
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl">Services</h1>
        <LinkButton href="/admin/services/new">Add service</LinkButton>
      </header>
      {services.length === 0 ? (
        <EmptyState title="No services yet" />
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {services.map((s, i) => (
            <li key={s.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.name}</p>
                <p className="mt-1 text-sm text-muted">
                  {formatPrice(s.price, s.currency, s.price_is_starting)} · {s.booking_mode === "full_day" ? "Full day" : formatDuration(s.duration_minutes)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {s.active ? <Badge className="border-success/40 text-success">Active</Badge> : <Badge>Inactive</Badge>}
                  {!s.blocks_calendar && <Badge>Remote / no calendar</Badge>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ActionButton variant="ghost" ariaLabel="Move up" action={moveService.bind(null, s.id, "up")} className={i === 0 ? "invisible" : ""}>↑</ActionButton>
                <ActionButton variant="ghost" ariaLabel="Move down" action={moveService.bind(null, s.id, "down")} className={i === services.length - 1 ? "invisible" : ""}>↓</ActionButton>
                <LinkButton href={`/admin/services/${s.id}`} variant="secondary" size="sm">Edit</LinkButton>
                <ActionButton
                  variant="danger"
                  action={deleteService.bind(null, s.id)}
                  confirm={{
                    title: `Delete “${s.name}”?`,
                    body: "Services that already have bookings cannot be deleted. Deactivate them instead.",
                    confirmLabel: "Delete",
                    danger: true,
                  }}
                >
                  Delete
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
