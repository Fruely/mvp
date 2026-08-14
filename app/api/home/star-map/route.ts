import { NextResponse } from "next/server";
import { fetchStarMapDataCached } from "@/lib/homepage/fetchStarMapData";

export async function GET() {
  try {
    const data = await fetchStarMapDataCached();
    return NextResponse.json(
      {
        total: data.total,
        cities: data.cities,
        eligibleCount: data.eligibleCount,
        representedCount: data.representedCount,
        missingCoordinatesCount: data.missingCoordinatesCount,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Star map unavailable";
    return NextResponse.json(
      { error: message },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
