import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { AuroraBackground } from "@/components/layout/AuroraBackground";
import { PractitionerCard, type PractitionerCardData } from "@/components/practitioners/PractitionerCard";

export const metadata: Metadata = {
  title: "Browse practitioners | Seudo",
  description:
    "Browse vetted tarot readers, astrologers, reiki healers, and spiritual coaches. Book a live one-on-one session.",
};

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
    <div className="relative mx-auto max-w-5xl px-6 py-12">
      <AuroraBackground intensity="subtle" />
      <h1 className="font-heading text-3xl font-semibold text-foreground">Practitioners</h1>
      <p className="mt-2 text-muted-foreground">Browse vetted tarot readers, astrologers, healers, and coaches.</p>

      {cards.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <p className="text-lg font-medium text-foreground">The first listing hasn&apos;t landed yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Seudo is brand new — be the first practitioner to publish a listing and get seen here.
          </p>
          <Link href="/signup?role=practitioner" className="mt-2">
            <Button className="cursor-pointer">List your services</Button>
          </Link>
        </div>
      ) : (
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
      )}
    </div>
  );
}
