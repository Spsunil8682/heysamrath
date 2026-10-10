"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveService } from "@/app/admin/_actions/services";
import { FormStatus } from "@/components/admin/form-status";
import { Button, buttonClass } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { initialActionState } from "@/lib/admin/action-state";
import type { Service } from "@/lib/types/database";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

export function ServiceForm({ service, defaultCurrency }: { service?: Service; defaultCurrency: string }) {
  const [state, action, pending] = useActionState(saveService, initialActionState);
  const [slug, setSlug] = useState(service?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!service);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="max-w-3xl space-y-5">
      {service && <input type="hidden" name="id" value={service.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="name" label="Name" required error={fe.name}>
          <Input id="name" name="name" defaultValue={service?.name} required maxLength={100} onChange={(e) => !slugTouched && setSlug(slugify(e.target.value))} />
        </Field>
        <Field id="slug" label="Slug (URL id)" required error={fe.slug}>
          <Input id="slug" name="slug" value={slug} onChange={(e) => (setSlugTouched(true), setSlug(e.target.value))} required />
        </Field>
      </div>
      <Field id="description" label="Description" error={fe.description}>
        <Textarea id="description" name="description" defaultValue={service?.description} maxLength={4000} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="price" label="Price (empty = on request)" error={fe.price}>
          <Input id="price" name="price" type="number" min={0} step="1" inputMode="decimal" defaultValue={service?.price ?? ""} />
        </Field>
        <Field id="currency" label="Currency" error={fe.currency}>
          <Input id="currency" name="currency" defaultValue={service?.currency ?? defaultCurrency} maxLength={3} required />
        </Field>
        <div className="flex items-end pb-3">
          <Checkbox name="priceIsStarting" defaultChecked={service?.price_is_starting ?? true} label='Show as "From …"' />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="bookingMode" label="Booking type" error={fe.bookingMode}>
          <Select id="bookingMode" name="bookingMode" defaultValue={service?.booking_mode ?? "timed"}>
            <option value="timed">Timed (start time + duration)</option>
            <option value="full_day">Full day</option>
          </Select>
        </Field>
        <Field id="durationMinutes" label="Duration (minutes)" error={fe.durationMinutes}>
          <Input id="durationMinutes" name="durationMinutes" type="number" min={15} max={1440} step={15} defaultValue={service?.duration_minutes ?? 120} required />
        </Field>
        <Field id="displayOrder" label="Display order" error={fe.displayOrder}>
          <Input id="displayOrder" name="displayOrder" type="number" defaultValue={service?.display_order ?? 100} />
        </Field>
      </div>
      <Field id="coverImageUrl" label="Cover image URL (optional)" error={fe.coverImageUrl} hint="/media/images/… or a Cloudinary URL">
        <Input id="coverImageUrl" name="coverImageUrl" defaultValue={service?.cover_image_url ?? ""} />
      </Field>
      <div className="space-y-3">
        <Checkbox name="active" defaultChecked={service?.active ?? true} label="Active (shown on the website and bookable)" />
        <Checkbox
          name="blocksCalendar"
          defaultChecked={service?.blocks_calendar ?? true}
          label="Occupies the shoot calendar (untick for remote work such as editing, which can overlap shoots)"
        />
      </div>
      <FormStatus state={state} />
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save service"}
        </Button>
        <Link href="/admin/services" className={buttonClass("ghost")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
