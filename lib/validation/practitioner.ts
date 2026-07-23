import { z } from "zod";
import {
  isValidCity,
  isValidCountry,
  isValidLanguage,
  isValidTimezone,
} from "@/lib/geo/profile-options";

export const SPECIALTIES = [
  "Tarot",
  "Astrology",
  "Reiki",
  "Human Design",
  "Spiritual Coaching",
  "Mediumship",
  "Meditation",
  "Numerology",
  "Energy Healing",
  "Clairvoyance",
] as const;

export const profileUpdateSchema = z
  .object({
    display_name: z.string().trim().min(1).max(100),
    bio: z.string().trim().max(2000).optional().nullable(),
    city: z.string().trim().max(100).optional().nullable(),
    country: z.string().trim().max(100).optional().nullable(),
    languages: z.array(z.string().trim().min(1)).max(20).default([]),
    years_experience: z.coerce.number().int().min(0).max(80).optional().nullable(),
    timezone: z.string().min(1),
    specialty_ids: z.array(z.number().int()).min(1).max(SPECIALTIES.length),
  })
  .superRefine((data, ctx) => {
    if (data.country && !isValidCountry(data.country)) {
      ctx.addIssue({ code: "custom", message: "Invalid country", path: ["country"] });
    }
    if (data.city) {
      if (!data.country) {
        ctx.addIssue({ code: "custom", message: "Select a country before choosing a city", path: ["city"] });
      } else if (!isValidCity(data.country, data.city)) {
        ctx.addIssue({ code: "custom", message: "Invalid city", path: ["city"] });
      }
    }
    for (const [index, language] of data.languages.entries()) {
      if (!isValidLanguage(language)) {
        ctx.addIssue({ code: "custom", message: "Invalid language", path: ["languages", index] });
      }
    }
    if (!isValidTimezone(data.timezone)) {
      ctx.addIssue({ code: "custom", message: "Invalid timezone", path: ["timezone"] });
    }
  });

export const serviceSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  duration_minutes: z.union([
    z.literal(15),
    z.literal(30),
    z.literal(45),
    z.literal(60),
    z.literal(90),
  ]),
  price_usd: z.coerce.number().positive().max(100000),
  is_active: z.boolean().default(true),
});

export const availabilityTemplateSchema = z.object({
  rows: z
    .array(
      z
        .object({
          day_of_week: z.number().int().min(0).max(6),
          start_time: z.string().regex(/^\d{2}:\d{2}$/),
          end_time: z.string().regex(/^\d{2}:\d{2}$/),
        })
        .refine((r) => r.end_time > r.start_time, {
          message: "end_time must be after start_time",
        })
    )
    .max(50),
});

export const availabilityBlockSchema = z
  .object({
    blocked_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    // Both unset = whole day blocked. Both set = only that time range within
    // the date is blocked. One-without-the-other is rejected below.
    start_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
    end_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  })
  .refine((v) => Boolean(v.start_time) === Boolean(v.end_time), {
    message: "Set both a start and end time, or leave both blank to block the whole day",
  })
  .refine((v) => !v.start_time || !v.end_time || v.end_time > v.start_time, {
    message: "end_time must be after start_time",
  });
