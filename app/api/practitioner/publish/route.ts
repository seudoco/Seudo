import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (typeof body?.is_published !== "boolean") {
    return NextResponse.json({ error: "is_published must be a boolean" }, { status: 400 });
  }

  // Unpublishing is always allowed — only going live requires completeness.
  if (!body.is_published) {
    const { error } = await supabase
      .from("practitioner_profiles")
      .update({ is_published: false })
      .eq("profile_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, is_published: false });
  }

  const [{ data: profile }, { count: specialtyCount }, { count: serviceCount }, { count: templateCount }] =
    await Promise.all([
      supabase
        .from("practitioner_profiles")
        .select("display_name, bio, timezone")
        .eq("profile_id", user.id)
        .single(),
      supabase
        .from("practitioner_specialties")
        .select("*", { count: "exact", head: true })
        .eq("practitioner_id", user.id),
      supabase
        .from("services")
        .select("*", { count: "exact", head: true })
        .eq("practitioner_id", user.id)
        .eq("is_active", true),
      supabase
        .from("availability_templates")
        .select("*", { count: "exact", head: true })
        .eq("practitioner_id", user.id),
    ]);

  const missing: string[] = [];
  if (!profile?.display_name) missing.push("display name");
  if (!profile?.bio) missing.push("bio");
  if (!profile?.timezone) missing.push("timezone");
  if (!specialtyCount) missing.push("at least one specialty");
  if (!serviceCount) missing.push("at least one active service");
  if (!templateCount) missing.push("at least one availability window");

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Complete your profile before publishing: ${missing.join(", ")}.` },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("practitioner_profiles")
    .update({ is_published: true })
    .eq("profile_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, is_published: true });
}
