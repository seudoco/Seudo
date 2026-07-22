import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { profileUpdateSchema } from "@/lib/validation/practitioner";

async function requirePractitioner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "practitioner") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { supabase, userId: user.id };
}

export async function GET() {
  const ctx = await requirePractitioner();
  if ("error" in ctx) return ctx.error;
  const { supabase, userId } = ctx;

  const [{ data: profile, error: profileErr }, { data: specialtyLinks }] = await Promise.all([
    supabase.from("practitioner_profiles").select("*").eq("profile_id", userId).single(),
    supabase.from("practitioner_specialties").select("specialty_id").eq("practitioner_id", userId),
  ]);

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ...profile,
    specialty_ids: (specialtyLinks ?? []).map((s) => s.specialty_id),
  });
}

export async function PATCH(request: Request) {
  const ctx = await requirePractitioner();
  if ("error" in ctx) return ctx.error;
  const { supabase, userId } = ctx;

  const body = await request.json().catch(() => null);
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  // Validate the timezone is a real IANA name — Intl throws on garbage input,
  // which is a cheap, reliable way to check without a hardcoded zone list.
  try {
    Intl.DateTimeFormat(undefined, { timeZone: parsed.data.timezone });
  } catch {
    return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });
  }

  const { specialty_ids, ...profileFields } = parsed.data;

  const { error: updateErr } = await supabase
    .from("practitioner_profiles")
    .update(profileFields)
    .eq("profile_id", userId);
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Replace-all pattern for the specialties junction, same rationale as the
  // availability template PUT: simpler than diffing, and this is a small set.
  const { error: deleteErr } = await supabase
    .from("practitioner_specialties")
    .delete()
    .eq("practitioner_id", userId);
  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }
  if (specialty_ids.length > 0) {
    const { error: insertErr } = await supabase
      .from("practitioner_specialties")
      .insert(specialty_ids.map((specialty_id) => ({ practitioner_id: userId, specialty_id })));
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
