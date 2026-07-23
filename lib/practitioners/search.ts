import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Text goes into a PostgREST `.or()` filter string, where `,` `(` `)` are
// syntax delimiters and `%` `_` are ILIKE wildcards — strip/cap rather than
// trust user input verbatim in a raw filter string.
function sanitizeSearchTerm(q: string): string {
  return q.replace(/[,()%_]/g, " ").trim().slice(0, 100);
}

/** Resolves a specialty name to the practitioner ids that have it. Returns
 * null when no specialty filter is requested (meaning: don't filter), or an
 * array (possibly empty) when one is — an empty array correctly yields zero
 * results via `.in("profile_id", [])` rather than skipping the filter. */
async function resolvePractitionerIdsForSpecialty(
  supabase: SupabaseClient<Database>,
  specialtyName: string | undefined
): Promise<string[] | null> {
  if (!specialtyName) return null;
  const { data: specialty } = await supabase
    .from("specialties")
    .select("id")
    .eq("name", specialtyName)
    .maybeSingle();
  if (!specialty) return [];
  const { data: links } = await supabase
    .from("practitioner_specialties")
    .select("practitioner_id")
    .eq("specialty_id", specialty.id);
  return (links ?? []).map((l) => l.practitioner_id);
}

export interface PractitionerListRow {
  profile_id: string;
  display_name: string | null;
  photo_url: string | null;
  city: string | null;
  country: string | null;
  avg_rating: number | null;
  review_count: number;
  created_at: string;
  practitioner_specialties: { specialties: { name: string } | null }[];
  services: { price_usd: number; is_active: boolean }[];
}

export interface PractitionerSearchParams {
  q?: string;
  specialty?: string;
  sort?: "rating" | "newest";
  page?: number;
}

export const PRACTITIONER_PAGE_SIZE = 12;

export async function searchPractitioners(
  supabase: SupabaseClient<Database>,
  params: PractitionerSearchParams
): Promise<{ items: PractitionerListRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, params.page ?? 1);
  const idFilter = await resolvePractitionerIdsForSpecialty(supabase, params.specialty);

  let query = supabase
    .from("practitioner_profiles")
    .select<string, PractitionerListRow>(
      "profile_id, display_name, photo_url, city, country, avg_rating, review_count, created_at, practitioner_specialties(specialty_id, specialties(name)), services(price_usd, is_active)",
      { count: "exact" }
    )
    .eq("is_published", true);

  if (idFilter) query = query.in("profile_id", idFilter);
  if (params.q) {
    const term = sanitizeSearchTerm(params.q);
    if (term) query = query.or(`display_name.ilike.%${term}%,bio.ilike.%${term}%`);
  }

  query =
    params.sort === "newest"
      ? query.order("created_at", { ascending: false })
      : query.order("avg_rating", { ascending: false, nullsFirst: false }).order("review_count", { ascending: false });

  const from = (page - 1) * PRACTITIONER_PAGE_SIZE;
  const { data, count } = await query.range(from, from + PRACTITIONER_PAGE_SIZE - 1);

  return { items: data ?? [], total: count ?? 0, page, pageSize: PRACTITIONER_PAGE_SIZE };
}

export interface ServiceListRow {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  price_usd: number;
  practitioner_id: string;
  created_at: string;
  practitioner_profiles: { profile_id: string; display_name: string | null; photo_url: string | null } | null;
}

export interface ServiceSearchParams {
  q?: string;
  specialty?: string;
  price_min?: number;
  price_max?: number;
  duration?: 15 | 30 | 45 | 60 | 90;
  sort?: "price_asc" | "price_desc" | "newest";
  page?: number;
}

export const SERVICE_PAGE_SIZE = 10;

export async function searchServices(
  supabase: SupabaseClient<Database>,
  params: ServiceSearchParams
): Promise<{ items: ServiceListRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, params.page ?? 1);
  const idFilter = await resolvePractitionerIdsForSpecialty(supabase, params.specialty);

  let query = supabase
    .from("services")
    .select<string, ServiceListRow>(
      "id, title, description, duration_minutes, price_usd, practitioner_id, created_at, practitioner_profiles!inner(profile_id, display_name, photo_url, is_published)",
      { count: "exact" }
    )
    .eq("is_active", true)
    .eq("practitioner_profiles.is_published", true);

  if (idFilter) query = query.in("practitioner_id", idFilter);
  if (params.q) {
    const term = sanitizeSearchTerm(params.q);
    if (term) query = query.ilike("title", `%${term}%`);
  }
  if (params.price_min != null) query = query.gte("price_usd", params.price_min);
  if (params.price_max != null) query = query.lte("price_usd", params.price_max);
  if (params.duration) query = query.eq("duration_minutes", params.duration);

  if (params.sort === "price_desc") query = query.order("price_usd", { ascending: false });
  else if (params.sort === "newest") query = query.order("created_at", { ascending: false });
  else query = query.order("price_usd", { ascending: true });

  const from = (page - 1) * SERVICE_PAGE_SIZE;
  const { data, count } = await query.range(from, from + SERVICE_PAGE_SIZE - 1);

  return { items: data ?? [], total: count ?? 0, page, pageSize: SERVICE_PAGE_SIZE };
}
