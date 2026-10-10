import { z } from "zod";
import { portfolioCategories } from "@/lib/config/site";
import { email, isoDate, mediaUrl, optionalMediaUrl, optionalText, phone, text, time, uuid } from "./common";

const checkbox = z
  .union([z.boolean(), z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
  .optional()
  .transform((v) => v === true || v === "on" || v === "true");

const intIn = (min: number, max: number, label: string) =>
  z.coerce
    .number({ error: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .min(min, `${label} must be at least ${min}`)
    .max(max, `${label} must be at most ${max}`);

export const serviceSchema = z.object({
  id: uuid.optional(),
  name: text(1, 100, "Name"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens")
    .max(80),
  description: optionalText(4000, "Description"),
  price: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s ? Number(s) : null))
    .refine((n) => n === null || (Number.isFinite(n) && n >= 0 && n < 1e10), "Enter a valid price or leave empty"),
  priceIsStarting: checkbox,
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code"),
  durationMinutes: intIn(15, 1440, "Duration"),
  bookingMode: z.enum(["timed", "full_day"]),
  blocksCalendar: checkbox,
  coverImageUrl: optionalMediaUrl,
  active: checkbox,
  displayOrder: intIn(-10000, 10000, "Display order"),
});

export const portfolioSchema = z
  .object({
    id: uuid.optional(),
    title: text(1, 140, "Title"),
    description: optionalText(4000, "Description"),
    category: z.enum(portfolioCategories.map((c) => c.value) as [string, ...string[]]),
    mediaType: z.enum(["image", "video"]),
    mediaUrl,
    thumbnailUrl: optionalMediaUrl,
    altText: optionalText(300, "Alt text"),
    eventDate: isoDate.or(z.literal("")).optional(),
    featured: checkbox,
    published: checkbox,
    displayOrder: intIn(-10000, 10000, "Display order"),
  })
  .refine((v) => v.mediaType !== "video" || !!v.thumbnailUrl, {
    path: ["thumbnailUrl"],
    message: "Videos need a thumbnail/poster image",
  });

const dayHours = z
  .object({ closed: checkbox, open: time.or(z.literal("")), close: time.or(z.literal("")) })
  .refine((d) => d.closed || (d.open && d.close && d.close > d.open), {
    message: "Closing time must be after opening time",
  });

export const settingsSchema = z
  .object({
    businessName: text(1, 80, "Business name"),
    tagline: optionalText(160, "Tagline"),
    logoUrl: optionalMediaUrl,
    phone: phone.or(z.literal("")),
    email: email.or(z.literal("")),
    whatsapp: z
      .string()
      .trim()
      .transform((s) => s.replace(/\D/g, ""))
      .refine((s) => s === "" || /^[1-9][0-9]{7,14}$/.test(s), "Digits with country code, e.g. 919876543210"),
    address: optionalText(300, "Address"),
    instagram: z.url().or(z.literal("")).optional(),
    youtube: z.url().or(z.literal("")).optional(),
    facebook: z.url().or(z.literal("")).optional(),
    timezone: z.string().trim().refine((tz) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, "Unknown time zone"),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code"),
    bufferMinutes: intIn(0, 720, "Buffer"),
    minNoticeHours: intIn(0, 2160, "Minimum notice"),
    maxAdvanceDays: intIn(1, 1095, "Booking window"),
    allowMultiplePerDay: checkbox,
    maxBookingsPerDay: intIn(1, 20, "Bookings per day"),
    hours: z.record(z.enum(["1", "2", "3", "4", "5", "6", "7"]), dayHours),
  })
  .refine((v) => [v.instagram, v.youtube, v.facebook].every((u) => !u || u.startsWith("https://")), {
    path: ["instagram"],
    message: "Social links must start with https://",
  });

export const blockSchema = z
  .object({
    startDate: isoDate,
    endDate: isoDate,
    startTime: time.or(z.literal("")).optional(),
    endTime: time.or(z.literal("")).optional(),
    reason: optionalText(200, "Reason"),
  })
  .refine((v) => v.endDate >= v.startDate, { path: ["endDate"], message: "End date must be on or after start date" })
  .refine((v) => !!v.startTime === !!v.endTime, { path: ["endTime"], message: "Give both start and end time" })
  .refine((v) => !v.startTime || v.startDate === v.endDate, {
    path: ["endDate"],
    message: "Time ranges apply to a single date",
  })
  .refine((v) => !v.startTime || !v.endTime || v.endTime > v.startTime, {
    path: ["endTime"],
    message: "End time must be after start time",
  });

export const bookingStatusChangeSchema = z.object({
  id: uuid,
  status: z.enum(["confirmed", "rejected", "cancelled", "completed", "pending"]),
});

export const bookingEditSchema = z.object({
  id: uuid,
  customerName: text(2, 120, "Name"),
  phone,
  email,
  serviceId: uuid,
  eventDate: isoDate,
  startTime: time.or(z.literal("")).optional(),
  endTime: time.or(z.literal("")).optional(),
  location: text(2, 300, "Location"),
  budget: optionalText(60, "Budget"),
  requirements: optionalText(4000, "Requirements"),
  adminNotes: optionalText(8000, "Notes"),
});
