import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceSchema } from "@/lib/validation/practitioner";

export async function PATCH(request: Request, ctx: RouteContext<"/api/practitioner/services/[id]">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = serviceSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  // RLS (services_update_own) also enforces ownership — the explicit
  // practitioner_id match here is just so a wrong-owner PATCH returns a
  // clean 404 (0 rows matched) instead of relying solely on the DB to
  // silently no-op the update.
  const { data, error } = await supabase
    .from("services")
    .update(parsed.data)
    .eq("id", id)
    .eq("practitioner_id", user.id)
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  return NextResponse.json(data);
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/practitioner/services/[id]">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", id)
    .eq("practitioner_id", user.id);

  if (error) {
    // FK violation (23503) — the services -> bookings reference has no ON
    // DELETE behavior (default RESTRICT), by design: bookings snapshot
    // price/duration at booking time, so deleting a service that's actually
    // been booked must not be allowed to touch that historical/financial
    // record. Translate into an actionable message instead of a raw DB error.
    if (error.code === "23503") {
      return NextResponse.json(
        { error: "This service has existing bookings and can't be deleted — deactivate it instead." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
