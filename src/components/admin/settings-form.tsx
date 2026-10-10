"use client";

import { useActionState } from "react";
import { saveSettings } from "@/app/admin/_actions/settings";
import { FormStatus } from "@/components/admin/form-status";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { initialActionState } from "@/lib/admin/action-state";
import type { BusinessSettings } from "@/lib/types/database";

const DAYS = [
  ["1", "Monday"],
  ["2", "Tuesday"],
  ["3", "Wednesday"],
  ["4", "Thursday"],
  ["5", "Friday"],
  ["6", "Saturday"],
  ["7", "Sunday"],
] as const;

function Section({ title, children, description }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-line bg-panel p-6">
      <legend className="px-2 font-display text-2xl">{title}</legend>
      {description && <p className="mb-5 text-sm text-muted">{description}</p>}
      {children}
    </fieldset>
  );
}

export function SettingsForm({ settings }: { settings: BusinessSettings }) {
  const [state, action, pending] = useActionState(saveSettings, initialActionState);
  const fe = state.fieldErrors ?? {};
  const s = settings;
  return (
    <form action={action} className="max-w-4xl space-y-8">
      <Section title="Business">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="businessName" label="Business name" required error={fe.businessName}>
            <Input id="businessName" name="businessName" defaultValue={s.business_name} required maxLength={80} />
          </Field>
          <Field id="logoUrl" label="Logo URL (optional)" error={fe.logoUrl} hint="/media/logos/logo.png or Cloudinary URL">
            <Input id="logoUrl" name="logoUrl" defaultValue={s.logo_url ?? ""} />
          </Field>
          <Field id="tagline" label="Tagline" error={fe.tagline} className="sm:col-span-2">
            <Input id="tagline" name="tagline" defaultValue={s.tagline ?? ""} maxLength={160} />
          </Field>
        </div>
      </Section>

      <Section title="Contact" description="Shown publicly on the website. Leave a field empty to hide it.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="email" label="Email" error={fe.email}>
            <Input id="email" name="email" type="email" defaultValue={s.email ?? ""} />
          </Field>
          <Field id="phone" label="Phone" error={fe.phone}>
            <Input id="phone" name="phone" type="tel" defaultValue={s.phone ?? ""} />
          </Field>
          <Field id="whatsapp" label="WhatsApp number" error={fe.whatsapp} hint="With country code, digits only, e.g. 919876543210">
            <Input id="whatsapp" name="whatsapp" inputMode="numeric" defaultValue={s.whatsapp ?? ""} />
          </Field>
          <Field id="address" label="Location / address" error={fe.address}>
            <Input id="address" name="address" defaultValue={s.address ?? ""} />
          </Field>
          <Field id="instagram" label="Instagram URL" error={fe.instagram}>
            <Input id="instagram" name="instagram" type="url" defaultValue={s.social_links?.instagram ?? ""} />
          </Field>
          <Field id="youtube" label="YouTube URL" error={fe.youtube}>
            <Input id="youtube" name="youtube" type="url" defaultValue={s.social_links?.youtube ?? ""} />
          </Field>
          <Field id="facebook" label="Facebook URL" error={fe.facebook}>
            <Input id="facebook" name="facebook" type="url" defaultValue={s.social_links?.facebook ?? ""} />
          </Field>
        </div>
      </Section>

      <Section title="Working hours" description="Customers can only request times inside these hours. Existing confirmed bookings are never removed by a change.">
        <div className="space-y-3">
          {DAYS.map(([key, label]) => {
            const h = s.business_hours?.[key] ?? null;
            const err = fe[`hours.${key}`];
            return (
              <div key={key} className="grid grid-cols-[7rem_1fr] items-center gap-3 sm:grid-cols-[8rem_7rem_1fr_1fr]">
                <span className="text-sm">{label}</span>
                <Checkbox name={`hours.${key}.closed`} defaultChecked={!h} label="Closed" />
                <Input aria-label={`${label} opens`} name={`hours.${key}.open`} type="time" defaultValue={h?.open ?? "09:00"} className="col-start-2 sm:col-start-auto" />
                <Input aria-label={`${label} closes`} name={`hours.${key}.close`} type="time" defaultValue={h?.close ?? "18:00"} className="col-start-2 sm:col-start-auto" />
                {err && <p role="alert" className="col-span-full text-xs text-danger">{label}: {err}</p>}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Booking rules">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="bufferMinutes" label="Buffer between bookings (min)" error={fe.bufferMinutes} hint="Travel / setup time after each shoot">
            <Input id="bufferMinutes" name="bufferMinutes" type="number" min={0} max={720} defaultValue={s.buffer_minutes} />
          </Field>
          <Field id="minNoticeHours" label="Minimum notice (hours)" error={fe.minNoticeHours}>
            <Input id="minNoticeHours" name="minNoticeHours" type="number" min={0} max={2160} defaultValue={s.min_notice_hours} />
          </Field>
          <Field id="maxAdvanceDays" label="Booking window (days ahead)" error={fe.maxAdvanceDays}>
            <Input id="maxAdvanceDays" name="maxAdvanceDays" type="number" min={1} max={1095} defaultValue={s.max_advance_days} />
          </Field>
          <div className="flex items-end pb-3 sm:col-span-2">
            <Checkbox name="allowMultiplePerDay" defaultChecked={s.allow_multiple_per_day} label="Allow more than one booking on the same day" />
          </div>
          <Field id="maxBookingsPerDay" label="Max bookings per day" error={fe.maxBookingsPerDay} hint="Used when multiple bookings are allowed">
            <Input id="maxBookingsPerDay" name="maxBookingsPerDay" type="number" min={1} max={20} defaultValue={s.max_bookings_per_day ?? 2} />
          </Field>
          <Field id="timezone" label="Time zone" error={fe.timezone} hint="IANA name, e.g. Asia/Kolkata. Locked while upcoming bookings exist.">
            <Input id="timezone" name="timezone" defaultValue={s.timezone} required />
          </Field>
          <Field id="currency" label="Currency" error={fe.currency}>
            <Input id="currency" name="currency" defaultValue={s.currency} maxLength={3} required />
          </Field>
        </div>
      </Section>

      <div className="sticky bottom-4 space-y-3 rounded-2xl border border-line bg-charcoal/95 p-4 backdrop-blur">
        <FormStatus state={state} />
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
