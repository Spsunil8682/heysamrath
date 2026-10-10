import "server-only";

/**
 * Optional transactional email. Disabled unless RESEND_API_KEY, EMAIL_FROM and OWNER_NOTIFICATION_EMAIL
 * are set (server-only variables). Called only AFTER the database write succeeded, and failures are
 * reported but never roll back or block the booking.
 */
export type EmailResult = { status: "sent" } | { status: "disabled" } | { status: "failed"; reason: string };

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.OWNER_NOTIFICATION_EMAIL);
}

async function send(to: string, subject: string, text: string, replyTo?: string): Promise<EmailResult> {
  if (!emailConfigured()) return { status: "disabled" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text, reply_to: replyTo }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { status: "failed", reason: `Provider responded ${res.status}` };
    return { status: "sent" };
  } catch (e) {
    return { status: "failed", reason: e instanceof Error ? e.name : "unknown" };
  }
}

export async function notifyOwnerOfBooking(b: {
  reference: string;
  serviceName: string;
  eventDate: string;
  startTime: string | null;
  customerName: string;
  customerEmail: string;
}): Promise<EmailResult> {
  return send(
    process.env.OWNER_NOTIFICATION_EMAIL!,
    `New booking request ${b.reference}`,
    [
      `A new booking request is waiting for review.`,
      ``,
      `Reference: ${b.reference}`,
      `Service:   ${b.serviceName}`,
      `Date:      ${b.eventDate}${b.startTime ? ` at ${b.startTime}` : ""}`,
      `Customer:  ${b.customerName} <${b.customerEmail}>`,
      ``,
      `Review it in the admin dashboard: /admin/bookings`,
    ].join("\n"),
    b.customerEmail,
  );
}

export async function notifyOwnerOfMessage(m: { name: string; email: string; message: string }): Promise<EmailResult> {
  return send(
    process.env.OWNER_NOTIFICATION_EMAIL!,
    `New enquiry from ${m.name}`,
    `${m.message}\n\n— ${m.name} <${m.email}>`,
    m.email,
  );
}
