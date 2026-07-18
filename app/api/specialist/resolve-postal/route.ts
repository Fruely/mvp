import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";
import { normalizePostalCode } from "@/lib/specialists/geography";
import { resolveGermanPostalLocation } from "@/lib/specialists/resolvePostalLocation";

export const dynamic = "force-dynamic";

/**
 * Shared PLZ → city/coords lookup for dashboard preview.
 * Uses the same resolver as dashboard save (no Zippopotam / divergent sources).
 */
export async function GET(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonNoStore({ error: "Not authenticated" }, { status: 401 });
  }

  const postalCode = normalizePostalCode(request.nextUrl.searchParams.get("postal_code"));
  if (!postalCode) {
    return jsonNoStore(
      { error: "invalid_postal_code", code: "invalid_postal_code" },
      { status: 400 }
    );
  }

  const service = createServiceClient();
  const resolved = await resolveGermanPostalLocation(service, postalCode);
  if (!resolved.ok) {
    return jsonNoStore(
      { error: resolved.reason, code: resolved.reason, ok: false },
      { status: 404 }
    );
  }

  return jsonNoStore({
    ok: true,
    source: resolved.source,
    location: resolved.location,
  });
}
