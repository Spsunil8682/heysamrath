"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { describedBy, Field, Input, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/states";
import { contactSchema, type ContactInput } from "@/lib/validation/contact";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({ resolver: zodResolver(contactSchema), mode: "onTouched" });

  const onSubmit = async (values: ContactInput) => {
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.ok) {
        setSent(true);
        reset();
        return;
      }
      setError(body?.message ?? "Your message could not be sent. Please try again.");
    } catch {
      setError("Network error: your message was not sent. Please try again.");
    }
  };

  if (sent) {
    return (
      <div role="status" className="rounded-2xl border border-success/30 bg-panel p-8 text-center">
        <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
        <h3 className="mt-4 font-display text-3xl">Message received</h3>
        <p className="mt-2 text-sm text-muted">Thank you. We&apos;ve saved your message and will reply as soon as we can.</p>
        <Button variant="secondary" className="mt-6" onClick={() => setSent(false)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onFocusCapture={() => !getValues("startedAt") && setValue("startedAt", Date.now())} onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
        <label>
          Website <input type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
        </label>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="c-name" label="Name" required error={errors.name?.message}>
          <Input id="c-name" autoComplete="name" aria-invalid={!!errors.name} aria-describedby={describedBy("c-name", errors.name?.message)} {...register("name")} />
        </Field>
        <Field id="c-email" label="Email" required error={errors.email?.message}>
          <Input id="c-email" type="email" autoComplete="email" aria-invalid={!!errors.email} aria-describedby={describedBy("c-email", errors.email?.message)} {...register("email")} />
        </Field>
        <Field id="c-phone" label="Phone (optional)" error={errors.phone?.message} className="sm:col-span-2">
          <Input id="c-phone" type="tel" autoComplete="tel" aria-invalid={!!errors.phone} {...register("phone")} />
        </Field>
        <Field id="c-message" label="Message" required error={errors.message?.message} className="sm:col-span-2">
          <Textarea id="c-message" aria-invalid={!!errors.message} aria-describedby={describedBy("c-message", errors.message?.message)} {...register("message")} />
        </Field>
      </div>
      {error && (
        <div role="alert">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
