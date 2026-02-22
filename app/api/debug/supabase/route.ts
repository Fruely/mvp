import { NextRequest, NextResponse } from "next/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getProjectRefFromSupabaseUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    const ref = host.split(".")[0];
    return ref || null;
  } catch {
    return null;
  }
}

function getProjectRefFromServiceKeyIss(
  serviceKey: string | undefined
): string | null {
  if (!serviceKey) return null;
  const payload = decodeJwtPayload(serviceKey);
  const iss = payload && typeof payload.iss === "string" ? payload.iss : null;
  if (!iss) return null;

  try {
    const host = new URL(iss).hostname;
    const ref = host.split(".")[0];
    return ref || null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const authResponse = requireAdminToken(request);
  if (authResponse) return authResponse;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

    const refFromUrl = getProjectRefFromSupabaseUrl(supabaseUrl);
    const refFromServiceKeyIss = getProjectRefFromServiceKeyIss(serviceKey);
    const payload = serviceKey ? decodeJwtPayload(serviceKey) : null;
    const role =
      payload && typeof payload.role === "string" ? payload.role : "unknown";

    const supabase = createSupabaseServerClient();

    const { count: categoriesCount, error: categoriesCountError } = await supabase
      .from("categories")
      .select("id", { count: "exact", head: true });

    const { count: parentCategoriesCount, error: parentCountError } = await supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .is("parent_id", null);

    const { data: categorySample, error: sampleError } = await supabase
      .from("categories")
      .select("id, slug, parent_id")
      .order("slug", { ascending: true })
      .limit(5);

    return NextResponse.json(
      {
        ok: true,
        vercel_env: process.env.VERCEL_ENV ?? "local",
        build_sha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? "local",
        supabase_ref_from_url: refFromUrl,
        supabase_ref_from_service_key_iss: refFromServiceKeyIss,
        refs_match:
          Boolean(refFromUrl) &&
          Boolean(refFromServiceKeyIss) &&
          refFromUrl === refFromServiceKeyIss,
        service_key_role: role,
        categories_count: categoriesCount ?? null,
        parent_categories_count: parentCategoriesCount ?? null,
        category_sample: categorySample ?? [],
        errors: {
          categories_count: categoriesCountError?.message ?? null,
          parent_categories_count: parentCountError?.message ?? null,
          category_sample: sampleError?.message ?? null,
        },
        supabase_url_tail: supabaseUrl ? `***${supabaseUrl.slice(-24)}` : "missing",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
