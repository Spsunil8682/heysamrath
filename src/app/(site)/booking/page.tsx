import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BookingForm } from "@/components/booking/booking-form";
import { Container, PageHeader } from "@/components/ui/container";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { WhatsAppBooking } from "@/components/booking/whatsapp-booking";
import { todayIn } from "@/lib/booking/calendar";
import { services as serviceInfo } from "@/lib/config/services";
import { getActiveServices, getSiteInfo } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Book a Session",
  description: "Check live availability and send a booking request. You'll receive a booking reference immediately.",
  alternates: { canonical: "/booking" },
};

async function BookingSection({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const params = await searchParams;
  let services;
  try {
    services = await getActiveServices();
  } catch {
    return (
      <ErrorState title="Booking is temporarily unavailable">
        We couldn&apos;t reach our booking system. Please try again shortly or use the contact page.
      </ErrorState>
    );
  }
  if (services.length === 0) {
    return <EmptyState title="Bookings open soon">No services are open for booking right now.</EmptyState>;
  }
  const info = await getSiteInfo();
  return (
    <BookingForm
      services={services.map(({ id, name, booking_mode, duration_minutes, blocks_calendar }) => ({
        id,
        name,
        booking_mode,
        duration_minutes,
        blocks_calendar,
      }))}
      initialServiceId={
        // Accepts a service id or slug (the services page links by slug).
        typeof params.service === "string"
          ? (services.find((s) => s.id === params.service || s.slug === params.service)?.id ?? undefined)
          : undefined
      }
      timezone={info.timezone}
      whatsapp={info.whatsapp}
      businessName={info.businessName}
    />
  );
}

async function WhatsAppBookingSection({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const [params, info] = await Promise.all([searchParams, getSiteInfo()]);
  if (!info.whatsapp) return null;
  const initial = serviceInfo.find((s) => s.slug === params.service)?.name;
  return (
    <section id="whatsapp" aria-labelledby="wa-title" className="mb-16 scroll-mt-28 rounded-2xl border border-gold/30 bg-panel p-6 sm:p-10">
      <h2 id="wa-title" className="font-display text-3xl sm:text-4xl">Book directly on WhatsApp</h2>
      <p className="mt-2 mb-8 max-w-2xl text-muted">
        The quickest way: choose your service and date, and WhatsApp opens with your request ready to send.
      </p>
      <WhatsAppBooking
        whatsapp={info.whatsapp}
        businessName={info.businessName}
        services={serviceInfo.map((s) => s.name)}
        initialService={initial}
        minDate={todayIn(info.timezone)}
      />
    </section>
  );
}

export default function BookingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <>
      <PageHeader
        eyebrow="Booking"
        title="Request your date"
        intro="Pick a service and an available date. We'll review your request and confirm with you personally."
      />
      <Container className="py-14 sm:py-20">
        <p id="booking-intro" className="sr-only">
          Booking request form. Fields marked with an asterisk are required.
        </p>
        <Suspense fallback={null}>
          <WhatsAppBookingSection searchParams={searchParams} />
        </Suspense>
        <h2 className="mb-8 font-display text-3xl sm:text-4xl">Or send a booking request here</h2>
        <Suspense fallback={<Skeleton className="h-[48rem]" />}>
          <BookingSection searchParams={searchParams} />
        </Suspense>
      </Container>
    </>
  );
}
