import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";

export const dynamic = "force-dynamic";

export async function GET() {
  let supabase;
  try {
    supabase = createSupabaseServerClient();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server misconfiguration";
    return NextResponse.json(
      { error: message, code: "config" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Only columns guaranteed by geo migration (supabase-specialists-listing.sql).
  // Omit optional fields (e.g. city) that may be missing on older DBs — PostgREST returns 400 for unknown select columns.
  const { data, error } = await supabase
    .from("specialists")
    .select("id, lat, lng")
    .eq("is_active", true)
    .eq("is_visible", true)
    .or("is_test.is.null,is_test.eq.false")
    .in("status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
    .not("lat", "is", null)
    .not("lng", "is", null)
    .limit(50);

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code ?? "supabase",
        details: error.details ?? null,
      },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }

  const points = (data ?? [])
    .filter((r) => typeof r.lat === "number" && typeof r.lng === "number")
    .map((r) => ({
      id: r.id as string,
      lat: r.lat as number,
      lng: r.lng as number,
    }));

  return NextResponse.json(
    { data: points },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
  );
}
