import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui/container";

export const metadata: Metadata = { title: "Privacy notice", alternates: { canonical: "/privacy" } };

// Template notice describing what this website actually does. Review it (and local legal requirements,
// e.g. India's DPDP Act) before launch.
export default function PrivacyPage() {
  return (
    <>
      <PageHeader eyebrow="Privacy" title="How we use your details" />
      <Container className="max-w-3xl py-14 sm:py-20">
        <div className="space-y-6 leading-relaxed text-muted [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-paper">
          <h2>What we collect</h2>
          <p>
            When you send a booking request or message we store the details you enter: your name, phone number, email,
            event date, time, location, budget range and any notes.
          </p>
          <h2>Why</h2>
          <p>
            Only to respond to your enquiry, plan and deliver the booked service, and keep basic business records. We do
            not sell your details or use them for unrelated marketing.
          </p>
          <h2>Who can see it</h2>
          <p>
            Your details are stored in our database (hosted by Supabase) and are visible only to the studio
            administrator. Other visitors never see your booking. Availability is shown publicly only as booked or open
            time ranges.
          </p>
          <h2>How long</h2>
          <p>We keep booking records for as long as needed for the service and our legal or accounting obligations.</p>
          <h2>Your choices</h2>
          <p>You can ask us to view, correct or delete your details at any time using the contact page.</p>
        </div>
      </Container>
    </>
  );
}
