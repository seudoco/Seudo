import { z } from "zod";

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

export const profileUpdateSchema = z.object({
  display_name: z.string().trim().min(1).max(100),
  bio: z.string().trim().max(2000).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  country: z.string().trim().max(100).optional().nullable(),
  languages: z.array(z.string().trim().min(1)).max(20).default([]),
  years_experience: z.coerce.number().int().min(0).max(80).optional().nullable(),
  timezone: z.string().min(1), // validated against Intl further in the route
  specialty_ids: z.array(z.number().int()).min(1).max(SPECIALTIES.length),
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

export const availabilityBlockSchema = z.object({
  blocked_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
