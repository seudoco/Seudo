import { createClient } from "@/lib/supabase/server";
import { PractitionerCard, type PractitionerCardData } from "@/components/practitioners/PractitionerCard";

// Explicit shape for this joined query — see the same note in
// app/practitioners/[id]/page.tsx (no FK Relationships metadata in the
// hand-written types/database.ts, so nested selects need an override).
interface PractitionerListRow {
  profile_id: string;
  display_name: string | null;
  photo_url: string | null;
  city: string | null;
  country: string | null;
  avg_rating: number | null;
  review_count: number;
  practitioner_specialties: { specialties: { name: string } | null }[];
  services: { price_usd: number; is_active: boolean }[];
}

// Minimal browse listing — full search/filter/sort/pagination is Phase 3
// proper. This exists now so practitioners (and, later, clients) can
// actually see and click into other listings, not just their own dashboard.
export default async function PractitionersPage() {
  const supabase = await createClient();

  const { data: practitioners } = await supabase
    .from("practitioner_profiles")
    .select<string, PractitionerListRow>(
      "profile_id, display_name, photo_url, city, country, avg_rating, review_count, practitioner_specialties(specialty_id, specialties(name)), services(price_usd, is_active)"
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  const cards: PractitionerCardData[] = (practitioners ?? []).map((p) => {
    const activePrices = (p.services ?? []).filter((s) => s.is_active).map((s) => s.price_usd);
    return {
      profile_id: p.profile_id,
      display_name: p.display_name,
      photo_url: p.photo_url,
      city: p.city,
      country: p.country,
      avg_rating: p.avg_rating,
      review_count: p.review_count,
      specialtyNames: (p.practitioner_specialties ?? [])
        .map((ps) => ps.specialties?.name)
        .filter((n): n is string => Boolean(n)),
      startingPrice: activePrices.length > 0 ? Math.min(...activePrices) : null,
    };
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-heading text-3xl font-semibold text-foreground">Practitioners</h1>
      <p className="mt-2 text-muted-foreground">Browse vetted tarot readers, astrologers, healers, and coaches.</p>

      {cards.length === 0 ? (
        <p className="mt-10 text-muted-foreground">No published practitioners yet — check back soon.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((p) => (
            <PractitionerCard key={p.profile_id} practitioner={p} />
          ))}
        </div>
      )}
    </div>
  );
}
