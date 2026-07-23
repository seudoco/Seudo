import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Text goes into a PostgREST `.eq()`/`.ilike()` filter or an RPC argument —
// strip characters that are ILIKE wildcards (`%` `_`) or PostgREST filter
// syntax delimiters (`,` `(` `)`) rather than trust user input verbatim.
function sanitizeSearchTerm(q: string): string {
  return q.replace(/[,()%_]/g, " ").trim().slice(0, 100);
}

export interface ServiceCardData {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  price_usd: number;
  created_at: string;
  specialties: { name: string } | null;
  practitioner_profiles: {
    profile_id: string;
    display_name: string | null;
    photo_url: string | null;
    avg_rating: number | null;
    review_count: number;
  };
}

export interface ServiceSearchParams {
  q?: string;
  specialty?: string;
  sort?: "rating" | "newest" | "price_asc" | "price_desc";
  page?: number;
}

export const SERVICE_PAGE_SIZE = 12;

/** Services (not practitioners) are the primary browsable unit — searching
 * "Human Design 101" should return that exact listing, not just the
 * practitioner's profile. `search_services_fuzzy` (see
 * supabase/migrations/0010_search_services_fuzzy.sql) matches service
 * title/description, the practitioner's own name/bio/location, and the
 * service's specialty tag — ILIKE plus pg_trgm similarity, so a typo like
 * "tarrot" still matches. */
export async function searchServiceListings(
  supabase: SupabaseClient<Database>,
  params: ServiceSearchParams
): Promise<{ items: ServiceCardData[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, params.page ?? 1);

  let idFilter: string[] | null = null;
  const term = params.q ? sanitizeSearchTerm(params.q) : "";
  if (term) {
    const { data } = await supabase.rpc("search_services_fuzzy", { search_term: term });
    idFilter = (data ?? []).map((r) => r.service_id);
  }

  // The specialty chip filter needs `!inner` on the specialties join so
  // `.eq("specialties.name", ...)` actually restricts rows — but `!inner`
  // would wrongly exclude untagged services (specialty_id null) whenever no
  // chip is selected, so only apply it when a specialty filter is active.
  const specialtiesJoin = params.specialty ? "specialties!inner(name)" : "specialties(name)";

  let query = supabase
    .from("services")
    .select<string, ServiceCardData>(
      `id, title, description, duration_minutes, price_usd, created_at, ${specialtiesJoin}, practitioner_profiles!inner(profile_id, display_name, photo_url, avg_rating, review_count, is_published)`,
      { count: "exact" }
    )
    .eq("is_active", true)
    .eq("practitioner_profiles.is_published", true);

  if (params.specialty) query = query.eq("specialties.name", params.specialty);
  if (idFilter) query = query.in("id", idFilter);

  if (params.sort === "newest") {
    query = query.order("created_at", { ascending: false });
  } else if (params.sort === "price_asc") {
    query = query.order("price_usd", { ascending: true });
  } else if (params.sort === "price_desc") {
    query = query.order("price_usd", { ascending: false });
  } else {
    // Rating sort orders by the practitioner's own rating — `referencedTable`
    // only takes effect because practitioner_profiles is joined with
    // `!inner` above (plain `.order` on an embedded resource is a no-op
    // otherwise). Zero-review practitioners sort last via nullsFirst:false.
    query = query
      .order("avg_rating", { referencedTable: "practitioner_profiles", ascending: false, nullsFirst: false })
      .order("review_count", { referencedTable: "practitioner_profiles", ascending: false });
  }

  const from = (page - 1) * SERVICE_PAGE_SIZE;
  const { data, count } = await query.range(from, from + SERVICE_PAGE_SIZE - 1);

  return { items: data ?? [], total: count ?? 0, page, pageSize: SERVICE_PAGE_SIZE };
}
