import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { AuroraBackground } from "@/components/layout/AuroraBackground";
import { PractitionerCard, type PractitionerCardData } from "@/components/practitioners/PractitionerCard";
import { PractitionerFilterBar } from "@/components/practitioners/PractitionerFilterBar";
import { Pagination } from "@/components/practitioners/Pagination";
import { searchPractitioners } from "@/lib/practitioners/search";

export const metadata: Metadata = {
  title: "Browse practitioners | Seudo",
  description:
    "Search vetted tarot readers, astrologers, reiki healers, and spiritual coaches by name, location, or specialty.",
};

// A newly published listing (or a newly added service) must show up here
// immediately for other visitors — never serve a stale cached render.
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PractitionersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const q = first(params.q);
  const specialty = first(params.specialty);
  const page = Number(first(params.page) ?? "1") || 1;
  const sortRaw = first(params.sort);
  const sort =
    sortRaw === "newest" || sortRaw === "price_asc" || sortRaw === "price_desc" ? sortRaw : "rating";

  const { data: allSpecialties } = await supabase.from("specialties").select("name").order("id");
  const specialtyNames = (allSpecialties ?? []).map((s) => s.name);

  const { items, total, pageSize } = await searchPractitioners(supabase, { q, specialty, page, sort });

  const cards: PractitionerCardData[] = items.map((p) => {
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

  const hasFilters = Boolean(q || specialty);
  const flatParams: Record<string, string | undefined> = { q, specialty, sort: sortRaw };

  return (
    <div className="relative mx-auto max-w-5xl px-6 py-12">
      <AuroraBackground intensity="subtle" />
      <h1 className="font-heading text-3xl font-semibold text-foreground">Browse practitioners</h1>
      <p className="mt-2 text-muted-foreground">
        Search by name, location, or specialty — try &quot;tarot&quot; or a city.
      </p>

      <PractitionerFilterBar specialtyNames={specialtyNames} />

      {cards.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <p className="text-lg font-medium text-foreground">
            {hasFilters ? "Nothing matches those filters" : "The first listing hasn't landed yet"}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {hasFilters
              ? "Try a different search term or clear a filter."
              : "Seudo is brand new — be the first practitioner to publish a listing and get seen here."}
          </p>
          {!hasFilters && (
            <Link href="/signup?role=practitioner" className="mt-2">
              <Button className="cursor-pointer">List your services</Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((p, i) => (
              <div
                key={p.profile_id}
                className="animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards duration-500"
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                <PractitionerCard practitioner={p} />
              </div>
            ))}
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} searchParams={flatParams} />
        </>
      )}
    </div>
  );
}
