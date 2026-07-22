import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "practitioner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File must be under 5MB" }, { status: 400 });
  }
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: "File must be JPEG, PNG, or WebP" }, { status: 400 });
  }

  // Fixed filename per practitioner (not per-upload) — re-uploading replaces
  // the photo in place rather than accumulating orphaned files, and the
  // storage RLS policies (0004_storage.sql) scope writes to this exact
  // {practitioner_id}/... prefix.
  const path = `${user.id}/photo.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from("practitioner-photos")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("practitioner-photos").getPublicUrl(path);

  // Cache-bust — same path, new content, upsert:true, so downstream <img>
  // tags would otherwise keep showing a stale cached image after re-upload.
  const bustedUrl = `${publicUrl}?v=${Date.now()}`;

  const { error: updateErr } = await supabase
    .from("practitioner_profiles")
    .update({ photo_url: bustedUrl })
    .eq("profile_id", user.id);
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ photo_url: bustedUrl });
}
