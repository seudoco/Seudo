import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchPractitioners, searchServices } from "@/lib/practitioners/search";

const DURATIONS = new Set([15, 30, 45, 60, 90]);

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const params = request.nextUrl.searchParams;
  const view = params.get("view") === "services" ? "services" : "practitioners";
  const q = params.get("q") ?? undefined;
  const specialty = params.get("specialty") ?? undefined;
  const page = Number(params.get("page") ?? "1") || 1;

  if (view === "services") {
    const durationRaw = Number(params.get("duration"));
    const priceMinRaw = Number(params.get("price_min"));
    const priceMaxRaw = Number(params.get("price_max"));
    const sort = params.get("sort");
    const result = await searchServices(supabase, {
      q,
      specialty,
      page,
      duration: DURATIONS.has(durationRaw) ? (durationRaw as 15 | 30 | 45 | 60 | 90) : undefined,
      price_min: Number.isFinite(priceMinRaw) && priceMinRaw > 0 ? priceMinRaw : undefined,
      price_max: Number.isFinite(priceMaxRaw) && priceMaxRaw > 0 ? priceMaxRaw : undefined,
      sort: sort === "price_desc" || sort === "newest" ? sort : "price_asc",
    });
    return NextResponse.json(result);
  }

  const sort = params.get("sort");
  const result = await searchPractitioners(supabase, {
    q,
    specialty,
    page,
    sort: sort === "newest" ? "newest" : "rating",
  });
  return NextResponse.json(result);
}
