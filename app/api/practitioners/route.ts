import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchPractitioners } from "@/lib/practitioners/search";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const params = request.nextUrl.searchParams;
  const q = params.get("q") ?? undefined;
  const specialty = params.get("specialty") ?? undefined;
  const page = Number(params.get("page") ?? "1") || 1;
  const sort = params.get("sort");

  const result = await searchPractitioners(supabase, {
    q,
    specialty,
    page,
    sort: sort === "newest" || sort === "price_asc" || sort === "price_desc" ? sort : "rating",
  });
  return NextResponse.json(result);
}
