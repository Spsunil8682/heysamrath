"use client";

import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { whatsappLink } from "@/lib/utils/format";
import { whatsAppBookingMessage } from "@/lib/utils/whatsapp-message";

/**
 * Quick booking over WhatsApp: the customer picks a service and date, and WhatsApp opens with the
 * details already typed. Nothing is stored on the website; the owner confirms the date in the chat.
 */
export function WhatsAppBooking({
  whatsapp,
  businessName,
  services,
  initialService,
  minDate,
}: {
  whatsapp: string;
  businessName: string;
  services: string[];
  initialService?: string;
  minDate: string;
}) {
  const [service, setService] = useState(initialService && services.includes(initialService) ? initialService : "");
  const [date, setDate] = useState("");
  const [reels, setReels] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{ service?: string; date?: string }>({});

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = {
      service: service ? undefined : "Choose a service",
      date: !date ? "Choose a date" : date < minDate ? "Choose today or a later date" : undefined,
    };
    setErrors(next);
    if (next.service || next.date) return;
    const href = whatsappLink(
      whatsapp,
      whatsAppBookingMessage({ businessName, service, date, reels, name, location, notes }),
    );
    if (href) window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
      <Field id="wa-service" label="Service" required error={errors.service}>
        <Select id="wa-service" value={service} onChange={(e) => setService(e.target.value)} aria-invalid={!!errors.service}>
          <option value="">Select a service…</option>
          {services.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </Field>
      <Field id="wa-date" label="Date" required error={errors.date}>
        <Input id="wa-date" type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={!!errors.date} />
      </Field>
      <Field id="wa-reels" label="Number of reels">
        <Select id="wa-reels" value={reels} onChange={(e) => setReels(e.target.value)}>
          <option value="">Not sure yet</option>
          {["1", "2", "3", "5", "More than 5"].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </Select>
      </Field>
      <Field id="wa-name" label="Your name">
        <Input id="wa-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      </Field>
      <Field id="wa-location" label="Location">
        <Input id="wa-location" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120} />
      </Field>
      <Field id="wa-notes" label="Anything else?">
        <Textarea id="wa-notes" rows={1} className="min-h-11" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" className="w-full sm:w-auto">
          <MessageCircle className="size-4" aria-hidden /> Send on WhatsApp
        </Button>
        <p className="mt-3 text-xs text-subtle">
          Opens WhatsApp with your details typed in. Your date is confirmed once we reply.
        </p>
      </div>
    </form>
  );
}
