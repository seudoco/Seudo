import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const { data: practitioners } = await supabase
    .from("practitioner_profiles")
    .select("profile_id, updated_at")
    .eq("is_published", true);

  const base = "https://seudo.co";
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/practitioners`, changeFrequency: "daily", priority: 0.9 },
    ...(practitioners ?? []).map((p) => ({
      url: `${base}/practitioners/${p.profile_id}`,
      lastModified: p.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
