import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSlots } from "@/lib/availability/generateSlots";

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/practitioners/[id]/slots">
) {
  const { id } = await ctx.params;
  const serviceId = request.nextUrl.searchParams.get("serviceId");
  if (!serviceId) return NextResponse.json({ error: "serviceId is required" }, { status: 400 });

  const supabase = await createClient();

  const [{ data: practitioner }, { data: service }] = await Promise.all([
    supabase
      .from("practitioner_profiles")
      .select("timezone, is_published, stripe_connect_onboarded")
      .eq("profile_id", id)
      .single(),
    supabase
      .from("services")
      .select("duration_minutes, is_active")
      .eq("id", serviceId)
      .eq("practitioner_id", id)
      .single(),
  ]);

  // Booking isn't possible unless the listing is live, the exact service is
  // active, and the practitioner can actually receive the money.
  if (!practitioner || !practitioner.is_published || !practitioner.stripe_connect_onboarded) {
    return NextResponse.json({ slots: [] });
  }
  if (!service || !service.is_active) {
    return NextResponse.json({ slots: [] });
  }

  // availability_templates/availability_blocks are owner-only-read by RLS
  // (the plan's raw schedule structure is never exposed directly — see
  // 0001_init.sql), and bookings RLS only lets a viewer see their own —
  // this endpoint's whole purpose is to serve the *computed* slots publicly
  // without exposing those raw rows, so it needs the admin client to read
  // them regardless of who's asking; only the derived slots array below
  // ever leaves this function.
  const admin = createAdminClient();
  const [{ data: template }, { data: blocks }, { data: existingBookings }] = await Promise.all([
    admin.from("availability_templates").select("day_of_week, start_time, end_time").eq("practitioner_id", id),
    admin.from("availability_blocks").select("blocked_date, start_time, end_time").eq("practitioner_id", id),
    admin
      .from("bookings")
      .select("scheduled_start, scheduled_end")
      .eq("practitioner_id", id)
      .in("status", ["pending", "confirmed"]),
  ]);

  const slots = generateSlots({
    timezone: practitioner.timezone ?? "UTC",
    weeklyTemplate: template ?? [],
    blockedRanges: blocks ?? [],
    existingBookings: existingBookings ?? [],
    serviceDurationMinutes: service.duration_minutes,
  });

  return NextResponse.json({ slots });
}
