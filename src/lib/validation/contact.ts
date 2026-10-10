import { z } from "zod";
import { email, text } from "./common";

export const contactSchema = z.object({
  name: text(2, 120, "Name"),
  email,
  phone: z
    .string()
    .trim()
    .optional()
    .refine((s) => !s || /^\+?[0-9 ()-]{7,20}$/.test(s), "Enter a valid phone number"),
  message: text(10, 4000, "Message"),
  website: z.string().max(0).optional(),
  startedAt: z.number().int().optional(),
});

export type ContactInput = z.input<typeof contactSchema>;
