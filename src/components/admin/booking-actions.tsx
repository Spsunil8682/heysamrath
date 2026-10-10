"use client";

import { updateBookingStatus } from "@/app/admin/_actions/bookings";
import type { BookingStatus } from "@/lib/types/database";
import { ActionButton } from "./action-button";

type Transition = { to: BookingStatus; label: string; variant: "primary" | "secondary" | "danger"; body: string; danger?: boolean };

const transitions: Record<BookingStatus, Transition[]> = {
  pending: [
    { to: "confirmed", label: "Confirm booking", variant: "primary", body: "Availability is re-checked when you confirm. If the slot has been taken or blocked, confirmation is refused and nothing changes." },
    { to: "rejected", label: "Reject", variant: "danger", body: "The request will be marked as rejected. Let the customer know personally.", danger: true },
  ],
  confirmed: [
    { to: "completed", label: "Mark completed", variant: "secondary", body: "Mark this event as delivered/completed." },
    { to: "cancelled", label: "Cancel booking", variant: "danger", body: "The date will be released for other bookings.", danger: true },
  ],
  rejected: [{ to: "pending", label: "Reopen", variant: "secondary", body: "Move this request back to pending." }],
  cancelled: [{ to: "pending", label: "Reopen", variant: "secondary", body: "Move this booking back to pending. You can confirm it again if the slot is still free." }],
  completed: [],
};

export function BookingActions({ id, reference, status }: { id: string; reference: string; status: BookingStatus }) {
  const options = transitions[status];
  if (!options.length) return <p className="text-sm text-muted">No further status changes.</p>;
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((t) => (
        <ActionButton
          key={t.to}
          variant={t.variant}
          size="md"
          action={() => updateBookingStatus(id, t.to)}
          confirm={{ title: `${t.label}: ${reference}?`, body: t.body, confirmLabel: t.label, danger: t.danger }}
        >
          {t.label}
        </ActionButton>
      ))}
    </div>
  );
}
