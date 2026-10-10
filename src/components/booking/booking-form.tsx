"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarCheck, CheckCircle2, Clock, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { AvailabilityCalendar } from "@/components/calendar/availability-calendar";
import { useAvailability } from "@/components/calendar/use-availability";
import { Button, buttonClass } from "@/components/ui/button";
import { Checkbox, describedBy, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice, Spinner } from "@/components/ui/states";
import { localNowPlus, todayIn } from "@/lib/booking/calendar";
import { startTimeSlots } from "@/lib/booking/slots";
import { budgetRanges } from "@/lib/config/site";
import type { AvailabilityDay } from "@/lib/types/availability";
import type { Service } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";
import { formatDateOnly, formatDuration, formatTime, whatsappLink } from "@/lib/utils/format";
import { bookingRequestSchema, type BookingRequest, type BookingRequestInput } from "@/lib/validation/booking";

export type BookableService = Pick<Service, "id" | "name" | "booking_mode" | "duration_minutes" | "blocks_calendar">;

type Success = {
  booking_reference: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  service_name: string;
};

const SLOT_CODES = new Set(["SLOT_BLOCKED", "SLOT_UNAVAILABLE", "DAY_FULL", "OUTSIDE_HOURS", "NOTICE_TOO_SHORT", "CLOSED_DAY", "DATE_IN_PAST", "DATE_TOO_FAR"]);

export function BookingForm({
  services,
  initialServiceId,
  timezone,
  whatsapp,
  businessName,
}: {
  services: BookableService[];
  initialServiceId?: string;
  timezone: string;
  whatsapp: string | null;
  businessName: string;
}) {
  const [month, setMonth] = useState(() => todayIn(timezone).slice(0, 7));
  const availability = useAvailability(month);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<Success | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BookingRequestInput, unknown, BookingRequest>({
    resolver: zodResolver(bookingRequestSchema),
    mode: "onTouched",
    defaultValues: {
      serviceId: services.some((s) => s.id === initialServiceId) ? initialServiceId : "",
      eventDate: "",
      startTime: "",
      endTime: "",
      budget: "",
      consent: false as unknown as true,
      website: "",
    },
  });

  const [serviceId, eventDate, startTime] = useWatch({ control, name: ["serviceId", "eventDate", "startTime"] });
  const service = services.find((s) => s.id === serviceId);
  const selectedDay = availability.data?.days.find((d) => d.date === eventDate) ?? null;

  const slots = useMemo(() => {
    if (!service || service.booking_mode !== "timed" || !selectedDay || !availability.data) return [];
    const day: AvailabilityDay = service.blocks_calendar ? selectedDay : { ...selectedDay, busy: [], status: "available" };
    return startTimeSlots(
      day,
      service.duration_minutes,
      service.blocks_calendar ? availability.data.buffer_minutes : 0,
      localNowPlus(availability.data.timezone, availability.data.min_notice_hours),
    );
  }, [service, selectedDay, availability.data]);

  const onSelectDay = (day: AvailabilityDay) => {
    setValue("eventDate", day.date, { shouldValidate: true, shouldTouch: true });
    setValue("startTime", "");
  };

  const onSubmit = async (values: BookingRequest) => {
    setSubmitError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.ok) {
        setSuccess(body.data as Success);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (body?.fieldErrors) {
        for (const [field, message] of Object.entries(body.fieldErrors as Record<string, string>)) {
          setError(field as keyof BookingRequestInput, { message });
        }
      }
      if (body?.code && SLOT_CODES.has(body.code)) {
        availability.reload();
        setError(service?.booking_mode === "timed" ? "startTime" : "eventDate", { message: body.message });
      }
      setSubmitError(body?.message ?? "We couldn't send your request. Please try again.");
    } catch {
      setSubmitError("Network error: your request was not sent. Please check your connection and try again.");
    }
  };

  if (success) {
    const wa = whatsappLink(whatsapp, `Hi ${businessName}, I just sent booking request ${success.booking_reference}.`);
    return (
      <div className="rounded-2xl border border-success/30 bg-panel p-8 text-center sm:p-12" role="status" aria-live="polite">
        <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden />
        <h2 className="mt-5 font-display text-4xl">Request received</h2>
        <p className="mt-3 text-muted">Your booking reference is</p>
        <p className="mt-2 font-mono text-3xl tracking-[0.2em] text-gold-bright select-all">{success.booking_reference}</p>
        <dl className="mx-auto mt-8 max-w-sm space-y-2 text-left text-sm">
          <div className="flex justify-between gap-4 border-b border-line pb-2">
            <dt className="text-muted">Service</dt>
            <dd>{success.service_name}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line pb-2">
            <dt className="text-muted">Date</dt>
            <dd>{formatDateOnly(success.event_date)}</dd>
          </div>
          {success.start_time && (
            <div className="flex justify-between gap-4 border-b border-line pb-2">
              <dt className="text-muted">Time</dt>
              <dd>
                {formatTime(success.start_time)} – {formatTime(success.end_time)}
              </dd>
            </div>
          )}
        </dl>
        <p className="mx-auto mt-8 max-w-md text-sm text-muted">
          Your request is <strong className="text-paper">pending</strong>. It isn&apos;t confirmed until we review it and
          get back to you. Please keep your reference handy.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("primary")}>
              <MessageCircle className="size-4" aria-hidden /> Message us on WhatsApp
            </a>
          )}
          <Link href="/" className={buttonClass("secondary")}>
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onFocusCapture={() => !getValues("startedAt") && setValue("startedAt", Date.now())} onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-12" aria-describedby="booking-intro">
      {/* Honeypot: hidden from people and assistive tech, often filled by bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
        <label>
          Website <input type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
        </label>
      </div>

      <fieldset className="space-y-6">
        <legend className="font-display text-3xl">1. Choose a service</legend>
        <Field id="serviceId" label="Service" required error={errors.serviceId?.message}>
          <Select
            id="serviceId"
            aria-invalid={!!errors.serviceId}
            aria-describedby={describedBy("serviceId", errors.serviceId?.message)}
            {...register("serviceId", { onChange: () => setValue("startTime", "") })}
          >
            <option value="">Select a service…</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.booking_mode === "full_day" ? "full day" : formatDuration(s.duration_minutes)}
              </option>
            ))}
          </Select>
        </Field>
        {service && !service.blocks_calendar && (
          <Notice>This service is done remotely. The date and time you choose are for a short planning call.</Notice>
        )}
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="font-display text-3xl">2. Pick a date{service?.booking_mode === "timed" ? " & time" : ""}</legend>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <div>
            <AvailabilityCalendar
              month={month}
              onMonthChange={setMonth}
              data={availability.data}
              loading={availability.status === "loading"}
              error={availability.status === "error" ? availability.message : undefined}
              onRetry={availability.reload}
              selected={eventDate || null}
              onSelect={onSelectDay}
              selectableOnly
            />
            <input type="hidden" {...register("eventDate")} />
            {errors.eventDate && (
              <p role="alert" className="mt-2 text-xs text-danger">
                {errors.eventDate.message}
              </p>
            )}
          </div>

          <div className="space-y-5">
            {!eventDate && <p className="text-sm text-muted">Select an available date on the calendar.</p>}
            {eventDate && (
              <p className="flex items-center gap-2 text-sm">
                <CalendarCheck className="size-4 text-gold" aria-hidden />
                {formatDateOnly(eventDate)}
              </p>
            )}
            {eventDate && service?.booking_mode === "full_day" && (
              <Notice>Full-day coverage. We&apos;ll agree exact timings with you.</Notice>
            )}
            {eventDate && service?.booking_mode === "timed" && (
              <div>
                <p id="slot-label" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Start time <span className="text-gold">*</span>
                </p>
                {slots.some((s) => s.available) ? (
                  <div role="radiogroup" aria-labelledby="slot-label" className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        role="radio"
                        aria-checked={startTime === slot.time}
                        disabled={!slot.available}
                        onClick={() => setValue("startTime", slot.time, { shouldValidate: true })}
                        className={cn(
                          "h-10 rounded-lg border text-sm tabular-nums transition-colors",
                          startTime === slot.time
                            ? "border-gold bg-gold text-ink"
                            : "border-line-strong hover:border-gold disabled:border-transparent disabled:text-subtle/50 disabled:line-through",
                        )}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted">No start times left on this date for this service. Please pick another date.</p>
                )}
                {errors.startTime && (
                  <p role="alert" className="mt-2 text-xs text-danger">
                    {errors.startTime.message}
                  </p>
                )}
                {startTime && (
                  <p className="mt-3 flex items-center gap-2 text-xs text-muted">
                    <Clock className="size-3.5" aria-hidden /> Planned duration {formatDuration(service.duration_minutes)}.
                    You can add an end time below if it differs.
                  </p>
                )}
              </div>
            )}
            {eventDate && service?.booking_mode === "timed" && startTime && (
              <Field id="endTime" label="End time (optional)" error={errors.endTime?.message}>
                <Input id="endTime" type="time" step={900} aria-invalid={!!errors.endTime} {...register("endTime")} />
              </Field>
            )}
            {!service && eventDate && <p className="text-sm text-muted">Choose a service to see start times.</p>}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="font-display text-3xl">3. Your details</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field id="customerName" label="Full name" required error={errors.customerName?.message}>
            <Input id="customerName" autoComplete="name" aria-invalid={!!errors.customerName} aria-describedby={describedBy("customerName", errors.customerName?.message)} {...register("customerName")} />
          </Field>
          <Field id="phone" label="Phone" required error={errors.phone?.message}>
            <Input id="phone" type="tel" autoComplete="tel" inputMode="tel" aria-invalid={!!errors.phone} aria-describedby={describedBy("phone", errors.phone?.message)} {...register("phone")} />
          </Field>
          <Field id="email" label="Email" required error={errors.email?.message}>
            <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} aria-describedby={describedBy("email", errors.email?.message)} {...register("email")} />
          </Field>
          <Field id="budget" label="Budget range (optional)" error={errors.budget?.message}>
            <Select id="budget" {...register("budget")}>
              <option value="">Prefer not to say</option>
              {budgetRanges.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="location" label="Event location" required error={errors.location?.message} className="sm:col-span-2" hint="Venue name and city">
            <Input id="location" autoComplete="address-level2" aria-invalid={!!errors.location} aria-describedby={describedBy("location", errors.location?.message, true)} {...register("location")} />
          </Field>
          <Field id="requirements" label="Anything else we should know?" error={errors.requirements?.message} className="sm:col-span-2">
            <Textarea id="requirements" placeholder="Number of guests, events across the day, style references, deliverables…" {...register("requirements")} />
          </Field>
        </div>
        <div>
          <Checkbox
            {...register("consent")}
            aria-invalid={!!errors.consent}
            label={
              <>
                I agree that my details will be used to respond to this booking request, as described in the{" "}
                <Link href="/privacy" className="text-gold underline underline-offset-4" target="_blank">
                  privacy notice
                </Link>
                .
              </>
            }
          />
          {errors.consent && (
            <p role="alert" className="mt-2 text-xs text-danger">
              {errors.consent.message}
            </p>
          )}
        </div>
      </fieldset>

      {submitError && (
        <div role="alert">
          <Notice tone="danger">{submitError}</Notice>
        </div>
      )}

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? <Spinner label="Sending request" className="text-ink" /> : null}
          {isSubmitting ? "Sending…" : "Send booking request"}
        </Button>
        <p className="text-xs text-subtle">You&apos;ll get a reference number straight away. Nothing is charged now.</p>
      </div>
    </form>
  );
}
