import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { AuroraBackground } from "@/components/layout/AuroraBackground";
import { PractitionerCard, type PractitionerCardData } from "@/components/practitioners/PractitionerCard";
import { ServiceListingCard } from "@/components/practitioners/ServiceListingCard";
import { PractitionerFilterBar } from "@/components/practitioners/PractitionerFilterBar";
import { Pagination } from "@/components/practitioners/Pagination";
import { searchPractitioners, searchServices } from "@/lib/practitioners/search";

export const metadata: Metadata = {
  title: "Browse | Seudo",
  description:
    "Browse vetted tarot readers, astrologers, reiki healers, and spiritual coaches, or search individual bookable sessions directly.",
};

const DURATIONS = new Set([15, 30, 45, 60, 90]);

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

  const view = first(params.view) === "services" ? "services" : "practitioners";
  const q = first(params.q);
  const specialty = first(params.specialty);
  const page = Number(first(params.page) ?? "1") || 1;
  const sortRaw = first(params.sort);

  const { data: allSpecialties } = await supabase.from("specialties").select("name").order("id");
  const specialtyNames = (allSpecialties ?? []).map((s) => s.name);

  const flatParams: Record<string, string | undefined> = {
    view: view === "services" ? "services" : undefined,
    q,
    specialty,
    sort: sortRaw,
    duration: first(params.duration),
    price_min: first(params.price_min),
    price_max: first(params.price_max),
  };

  const heading = view === "services" ? "Browse services" : "Browse practitioners";
  const subheading =
    view === "services"
      ? "Search individual bookable sessions — filter by price, duration, and specialty."
      : "Browse vetted tarot readers, astrologers, healers, and coaches.";

  return (
    <div className="relative mx-auto max-w-5xl px-6 py-12">
      <AuroraBackground intensity="subtle" />
      <h1 className="font-heading text-3xl font-semibold text-foreground">{heading}</h1>
      <p className="mt-2 text-muted-foreground">{subheading}</p>

      <PractitionerFilterBar specialtyNames={specialtyNames} view={view} />

      {view === "services" ? (
        <ServicesGrid
          supabase={supabase}
          q={q}
          specialty={specialty}
          page={page}
          sortRaw={sortRaw}
          durationRaw={first(params.duration)}
          priceMinRaw={first(params.price_min)}
          priceMaxRaw={first(params.price_max)}
          flatParams={flatParams}
        />
      ) : (
        <PractitionersGrid
          supabase={supabase}
          q={q}
          specialty={specialty}
          page={page}
          sortRaw={sortRaw}
          flatParams={flatParams}
        />
      )}
    </div>
  );
}

async function PractitionersGrid({
  supabase,
  q,
  specialty,
  page,
  sortRaw,
  flatParams,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  q?: string;
  specialty?: string;
  page: number;
  sortRaw?: string;
  flatParams: Record<string, string | undefined>;
}) {
  const { items, total, pageSize } = await searchPractitioners(supabase, {
    q,
    specialty,
    page,
    sort: sortRaw === "newest" ? "newest" : "rating",
  });

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

  if (cards.length === 0) {
    return <EmptyState hasFilters={Boolean(q || specialty)} />;
  }

  return (
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
  );
}

async function ServicesGrid({
  supabase,
  q,
  specialty,
  page,
  sortRaw,
  durationRaw,
  priceMinRaw,
  priceMaxRaw,
  flatParams,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  q?: string;
  specialty?: string;
  page: number;
  sortRaw?: string;
  durationRaw?: string;
  priceMinRaw?: string;
  priceMaxRaw?: string;
  flatParams: Record<string, string | undefined>;
}) {
  const duration = Number(durationRaw);
  const priceMin = Number(priceMinRaw);
  const priceMax = Number(priceMaxRaw);

  const { items, total, pageSize } = await searchServices(supabase, {
    q,
    specialty,
    page,
    duration: DURATIONS.has(duration) ? (duration as 15 | 30 | 45 | 60 | 90) : undefined,
    price_min: Number.isFinite(priceMin) && priceMin > 0 ? priceMin : undefined,
    price_max: Number.isFinite(priceMax) && priceMax > 0 ? priceMax : undefined,
    sort: sortRaw === "price_desc" || sortRaw === "newest" ? sortRaw : "price_asc",
  });

  if (items.length === 0) {
    return <EmptyState hasFilters={Boolean(q || specialty || durationRaw || priceMinRaw || priceMaxRaw)} />;
  }

  return (
    <>
      <div className="mt-8 flex flex-col gap-3">
        {items.map((s, i) => (
          <div
            key={s.id}
            className="animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards duration-500"
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          >
            <ServiceListingCard service={s} />
          </div>
        ))}
      </div>
      <Pagination page={page} pageSize={pageSize} total={total} searchParams={flatParams} />
    </>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="mt-16 flex flex-col items-center gap-3 text-center">
      <p className="text-lg font-medium text-foreground">
        {hasFilters ? "Nothing matches those filters" : "The first listing hasn't landed yet"}
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {hasFilters
          ? "Try widening your search or clearing a filter."
          : "Seudo is brand new — be the first practitioner to publish a listing and get seen here."}
      </p>
      {!hasFilters && (
        <Link href="/signup?role=practitioner" className="mt-2">
          <Button className="cursor-pointer">List your services</Button>
        </Link>
      )}
    </div>
  );
}
