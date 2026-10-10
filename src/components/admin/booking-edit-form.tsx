"use client";

import { useActionState } from "react";
import { updateBooking } from "@/app/admin/_actions/bookings";
import { FormStatus } from "@/components/admin/form-status";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { initialActionState } from "@/lib/admin/action-state";
import type { Booking, Service } from "@/lib/types/database";

export function BookingEditForm({ booking, services }: { booking: Booking; services: Pick<Service, "id" | "name">[] }) {
  const [state, action, pending] = useActionState(updateBooking, initialActionState);
  const fe = state.fieldErrors ?? {};
  const t = (v: string | null) => (v ? v.slice(0, 5) : "");
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="id" value={booking.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="customerName" label="Name" error={fe.customerName}>
          <Input id="customerName" name="customerName" defaultValue={booking.customer_name} required />
        </Field>
        <Field id="phone" label="Phone" error={fe.phone}>
          <Input id="phone" name="phone" defaultValue={booking.phone} required />
        </Field>
        <Field id="email" label="Email" error={fe.email}>
          <Input id="email" name="email" type="email" defaultValue={booking.email} required />
        </Field>
        <Field id="serviceId" label="Service" error={fe.serviceId}>
          <Select id="serviceId" name="serviceId" defaultValue={booking.service_id}>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="eventDate" label="Event date" error={fe.eventDate}>
          <Input id="eventDate" name="eventDate" type="date" defaultValue={booking.event_date} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id="startTime" label="Start" error={fe.startTime}>
            <Input id="startTime" name="startTime" type="time" defaultValue={t(booking.start_time)} />
          </Field>
          <Field id="endTime" label="End" error={fe.endTime}>
            <Input id="endTime" name="endTime" type="time" defaultValue={t(booking.end_time)} />
          </Field>
        </div>
        <Field id="location" label="Location" error={fe.location} className="sm:col-span-2">
          <Input id="location" name="location" defaultValue={booking.location} required />
        </Field>
        <Field id="budget" label="Budget" error={fe.budget}>
          <Input id="budget" name="budget" defaultValue={booking.budget ?? ""} />
        </Field>
        <Field id="requirements" label="Customer requirements" error={fe.requirements} className="sm:col-span-2">
          <Textarea id="requirements" name="requirements" defaultValue={booking.requirements ?? ""} />
        </Field>
        <Field id="adminNotes" label="Internal notes (never shown to customers)" error={fe.adminNotes} className="sm:col-span-2">
          <Textarea id="adminNotes" name="adminNotes" defaultValue={booking.admin_notes ?? ""} />
        </Field>
      </div>
      <p className="text-xs text-subtle">
        Changing the date or time of a confirmed booking re-checks availability; the save is refused if it would conflict.
        Leave start/end empty for full-day services.
      </p>
      <FormStatus state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
