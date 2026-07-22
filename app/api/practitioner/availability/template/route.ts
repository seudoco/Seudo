import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { availabilityTemplateSchema } from "@/lib/validation/practitioner";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("availability_templates")
    .select("id, day_of_week, start_time, end_time")
    .eq("practitioner_id", user.id)
    .order("day_of_week");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// Full replace, not patch — matches the UI (a weekly grid edited and saved
// as a whole) and is simpler than diffing a small row set. Existing
// CONFIRMED bookings are never affected by this: generateSlots only reads
// the template to propose future open slots, and already-booked times are
// separately guaranteed immutable by the bookings table itself, not by
// anything in this route (see plan §2, "template edits apply going forward
// only").
export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = availabilityTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { error: deleteErr } = await supabase
    .from("availability_templates")
    .delete()
    .eq("practitioner_id", user.id);
  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });

  if (parsed.data.rows.length > 0) {
    const { error: insertErr } = await supabase.from("availability_templates").insert(
      parsed.data.rows.map((r) => ({ ...r, practitioner_id: user.id }))
    );
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
