import { z } from "zod";

function isAtLeast18(dateOfBirth: string): boolean {
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return false;
  const eighteenYearsAgo = new Date();
  eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
  return dob <= eighteenYearsAgo;
}

export const guestInfoSchema = z
  .object({
    email: z.string().trim().email(),
    password: z.string().min(8),
    full_name: z.string().trim().min(1).max(200),
    phone: z.string().trim().max(30).optional(),
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    country: z.string().trim().min(1).max(100),
    consent_accepted: z.literal(true),
  })
  .refine((v) => isAtLeast18(v.date_of_birth), {
    message: "You must be 18 or older to book a session",
    path: ["date_of_birth"],
  });

export const createBookingSchema = z.object({
  practitioner_id: z.string().uuid(),
  service_id: z.string().uuid(),
  scheduled_start: z.string().datetime(),
  guest_info: guestInfoSchema.optional(),
});
