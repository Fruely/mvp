import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { createCheckoutSessionForSpecialist } from "@/lib/billing/createCheckoutSession";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function resolveSiteUrl(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
  }

  const planCodeRaw = "plan_code" in body ? body.plan_code : null;
  const langRaw = "lang" in body && typeof body.lang === "string" ? body.lang : "ua";

  const service = createServiceClient();
  const { data: specialist, error: specError } = await service
    .from("specialists")
    .select("id")
    .eq("user_id", user.id)
    .neq("status", "blocked")
    .maybeSingle();

  if (specError || !specialist?.id) {
    return NextResponse.json({ error: "specialist_not_found" }, { status: 403, headers: NO_STORE });
  }

  const result = await createCheckoutSessionForSpecialist({
    specialistId: specialist.id,
    planCodeRaw,
    lang: langRaw,
    siteUrl: resolveSiteUrl(request),
  });

  if (!result.ok) {
    if (result.reason === "payments_disabled") {
      return NextResponse.json({ error: "payments_disabled" }, { status: 503, headers: NO_STORE });
    }
    if (result.reason === "invalid_plan") {
      return NextResponse.json({ error: "invalid_plan" }, { status: 400, headers: NO_STORE });
    }
    return NextResponse.json({ error: "provider_not_configured" }, { status: 501, headers: NO_STORE });
  }

  return NextResponse.json({ url: result.url }, { status: 200, headers: NO_STORE });
}
