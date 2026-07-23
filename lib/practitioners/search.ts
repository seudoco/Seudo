import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Text goes into a PostgREST `.or()`/`.ilike()` filter string, where `,` `(`
// `)` are syntax delimiters and `%` `_` are ILIKE wildcards — strip/cap
// rather than trust user input verbatim in a raw filter string.
function sanitizeSearchTerm(q: string): string {
  return q.replace(/[,()%_]/g, " ").trim().slice(0, 100);
}

/** Resolves a specialty name to the practitioner ids that have it (exact
 * match — used for the specialty chip filter). Returns null when no
 * specialty filter is requested, or an array (possibly empty) when one is —
 * empty correctly yields zero results via `.in("profile_id", [])` rather
 * than skipping the filter. */
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

/** Free-text search: matches name/bio/city/country directly, OR a specialty
 * whose name contains the term (so typing "tarot" surfaces every
 * practitioner tagged Tarot, not just ones with the word in their bio).
 * Both go through `search_*_fuzzy` Postgres functions (see
 * supabase/migrations/0007_fuzzy_search.sql) so a typo like "tarrot" still
 * matches via pg_trgm similarity, not just exact ILIKE substrings. */
async function resolvePractitionerIdsForQuery(
  supabase: SupabaseClient<Database>,
  term: string
): Promise<Set<string>> {
  const ids = new Set<string>();

  const { data: direct } = await supabase.rpc("search_practitioners_fuzzy", { search_term: term });
  for (const row of direct ?? []) ids.add(row.profile_id);

  const { data: matchingSpecialties } = await supabase.rpc("search_specialties_fuzzy", { search_term: term });
  if (matchingSpecialties && matchingSpecialties.length > 0) {
    const specialtyIds = matchingSpecialties.map((s) => s.id);

    // Profile-level tags (practitioner_specialties) — a practitioner's own
    // "I do this" badges.
    const { data: links } = await supabase
      .from("practitioner_specialties")
      .select("practitioner_id")
      .in("specialty_id", specialtyIds);
    for (const link of links ?? []) ids.add(link.practitioner_id);

    // Per-service tags — a practitioner should also surface if any one of
    // their services is tagged with the matched specialty, even if their
    // profile-level badges don't include it (see 0008/0009 migrations).
    const { data: taggedServices } = await supabase
      .from("services")
      .select("practitioner_id")
      .eq("is_active", true)
      .in("specialty_id", specialtyIds);
    for (const service of taggedServices ?? []) ids.add(service.practitioner_id);
  }

  return ids;
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
  sort?: "rating" | "newest" | "price_asc" | "price_desc";
  page?: number;
}

export const PRACTITIONER_PAGE_SIZE = 12;

function startingPrice(row: PractitionerListRow): number | null {
  const activePrices = (row.services ?? []).filter((s) => s.is_active).map((s) => s.price_usd);
  return activePrices.length > 0 ? Math.min(...activePrices) : null;
}

export async function searchPractitioners(
  supabase: SupabaseClient<Database>,
  params: PractitionerSearchParams
): Promise<{ items: PractitionerListRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, params.page ?? 1);

  // Specialty chip (exact) and free-text query (fuzzy, multi-field) are
  // separate filters that combine with AND — intersect their id sets rather
  // than picking one, so "Reiki" chip + "Denmark" text both apply together.
  const chipIds = await resolvePractitionerIdsForSpecialty(supabase, params.specialty);
  const term = params.q ? sanitizeSearchTerm(params.q) : "";
  const queryIds = term ? [...(await resolvePractitionerIdsForQuery(supabase, term))] : null;

  let idFilter: string[] | null = null;
  if (chipIds && queryIds) idFilter = chipIds.filter((id) => queryIds.includes(id));
  else idFilter = chipIds ?? queryIds;

  let baseQuery = supabase
    .from("practitioner_profiles")
    .select<string, PractitionerListRow>(
      "profile_id, display_name, photo_url, city, country, avg_rating, review_count, created_at, practitioner_specialties(specialty_id, specialties(name)), services(price_usd, is_active)",
      { count: "exact" }
    )
    .eq("is_published", true);
  if (idFilter) baseQuery = baseQuery.in("profile_id", idFilter);

  // Price isn't a real column on practitioner_profiles (it's a MIN() over
  // each practitioner's active services), so there's no DB-level ORDER BY
  // for it without a view/RPC. At MVP scale, fetch all matches, sort in JS,
  // and slice the page window manually — correct results over DB-level
  // pagination efficiency, which doesn't matter yet at this data volume.
  if (params.sort === "price_asc" || params.sort === "price_desc") {
    const { data } = await baseQuery;
    const all = data ?? [];
    const withPrice = all.filter((r) => startingPrice(r) !== null);
    const withoutPrice = all.filter((r) => startingPrice(r) === null);
    withPrice.sort((a, b) => {
      const diff = (startingPrice(a) ?? 0) - (startingPrice(b) ?? 0);
      return params.sort === "price_desc" ? -diff : diff;
    });
    const ordered = [...withPrice, ...withoutPrice];
    const from = (page - 1) * PRACTITIONER_PAGE_SIZE;
    return {
      items: ordered.slice(from, from + PRACTITIONER_PAGE_SIZE),
      total: ordered.length,
      page,
      pageSize: PRACTITIONER_PAGE_SIZE,
    };
  }

  const sortedQuery =
    params.sort === "newest"
      ? baseQuery.order("created_at", { ascending: false })
      : baseQuery.order("avg_rating", { ascending: false, nullsFirst: false }).order("review_count", { ascending: false });

  const from = (page - 1) * PRACTITIONER_PAGE_SIZE;
  const { data, count } = await sortedQuery.range(from, from + PRACTITIONER_PAGE_SIZE - 1);

  return { items: data ?? [], total: count ?? 0, page, pageSize: PRACTITIONER_PAGE_SIZE };
}
