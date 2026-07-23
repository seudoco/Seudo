import { NextResponse } from "next/server";
import { searchCities } from "@/lib/geo/profile-options";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country")?.trim() ?? "";
  const query = searchParams.get("q")?.trim() ?? "";

  if (!country) {
    return NextResponse.json({ cities: [] });
  }

  const cities = searchCities(country, query, 20);
  return NextResponse.json({ cities });
}
