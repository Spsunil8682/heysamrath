import { z } from "zod";
import { budgetRanges } from "@/lib/config/site";
import { email, isoDate, optionalText, phone, text, time, uuid } from "./common";

/** Shared by the booking form (client) and POST /api/bookings (server). */
export const bookingRequestSchema = z
  .object({
    customerName: text(2, 120, "Name"),
    phone,
    email,
    serviceId: uuid.or(z.literal("")).refine((v) => v !== "", "Choose a service"),
    eventDate: isoDate,
    startTime: time.or(z.literal("")).optional(),
    endTime: time.or(z.literal("")).optional(),
    location: text(2, 300, "Location"),
    budget: z.enum(budgetRanges).or(z.literal("")).optional(),
    requirements: optionalText(4000, "Requirements"),
    consent: z.literal(true, { error: "Please accept the privacy notice to continue" }),
    // Anti-spam: hidden field that must stay empty, and the time the form was rendered.
    website: z.string().max(0).optional(),
    startedAt: z.number().int().optional(),
  })
  .refine((v) => !v.endTime || !!v.startTime, { path: ["startTime"], message: "Choose a start time" });

export type BookingRequestInput = z.input<typeof bookingRequestSchema>;
export type BookingRequest = z.output<typeof bookingRequestSchema>;

export const availabilityQuerySchema = z
  .object({ from: isoDate, to: isoDate })
  .refine((v) => v.from <= v.to, "from must be before to");
