import { formatDateOnly } from "./format";

export type WhatsAppBookingDetails = {
  businessName: string;
  service: string;
  date: string; // YYYY-MM-DD
  reels?: string;
  name?: string;
  location?: string;
  notes?: string;
};

/** The pre-filled WhatsApp message a customer sends to request a date. */
export function whatsAppBookingMessage(d: WhatsAppBookingDetails): string {
  const lines = [
    `Hi ${d.businessName}, I'd like to book a shoot.`,
    "",
    `Service: ${d.service}`,
    `Date: ${formatDateOnly(d.date)}`,
  ];
  if (d.reels?.trim()) lines.push(`Reels: ${d.reels.trim()}`);
  if (d.name?.trim()) lines.push(`Name: ${d.name.trim()}`);
  if (d.location?.trim()) lines.push(`Location: ${d.location.trim()}`);
  if (d.notes?.trim()) lines.push(`Details: ${d.notes.trim()}`);
  lines.push("", "Is this date available?");
  return lines.join("\n");
}
