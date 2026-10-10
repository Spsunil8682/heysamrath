import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { AvailabilityExplorer } from "@/components/calendar/availability-explorer";
import { Container, PageHeader } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/states";
import { getSiteInfo } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Availability",
  description: "See which dates are open for shoots and events.",
  alternates: { canonical: "/availability" },
};

async function Explorer() {
  await connection();
  const info = await getSiteInfo();
  return <AvailabilityExplorer timezone={info.timezone} />;
}

export default function AvailabilityPage() {
  return (
    <>
      <PageHeader eyebrow="Availability" title="Find an open date" intro="Live availability, updated as bookings are confirmed." />
      <Container className="py-14 sm:py-20">
        <Suspense fallback={<Skeleton className="h-[34rem]" />}>
          <Explorer />
        </Suspense>
      </Container>
    </>
  );
}
