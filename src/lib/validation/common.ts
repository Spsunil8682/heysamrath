import { z } from "zod";
import { isAllowedMediaUrl } from "@/lib/media";

const stripControl = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

export const text = (min: number, max: number, label: string) =>
  z
    .string({ error: `${label} is required` })
    .transform((s) => stripControl(s).trim())
    .pipe(
      z
        .string()
        .min(min, min <= 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
        .max(max, `${label} must be at most ${max} characters`),
    );

export const optionalText = (max: number, label: string) =>
  z
    .string()
    .optional()
    .transform((s) => (s ? stripControl(s).trim() : ""))
    .pipe(z.string().max(max, `${label} must be at most ${max} characters`));

export const email = z
  .string({ error: "Email is required" })
  .trim()
  .toLowerCase()
  .max(254, "Email is too long")
  .pipe(z.email("Enter a valid email address"));

export const phone = z
  .string({ error: "Phone number is required" })
  .trim()
  .regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number (digits, spaces, +, - only)")
  .refine((s) => s.replace(/\D/g, "").length >= 7, "Enter a valid phone number");

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date");
export const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");
export const uuid = z.uuid("Invalid id");

export const mediaUrl = z
  .string()
  .trim()
  .refine(isAllowedMediaUrl, "Use a local path under /media/… or an https://res.cloudinary.com/… URL");

export const optionalMediaUrl = z
  .string()
  .trim()
  .optional()
  .transform((s) => s || null)
  .refine((s) => s === null || isAllowedMediaUrl(s), "Use a local path under /media/… or an https://res.cloudinary.com/… URL");
