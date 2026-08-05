import { NextRequest, NextResponse } from "next/server";
import { createPromotedAccessCheckout } from "@/lib/billing/createPromotedAccessCheckout";
import { findUntrustedPromotedAccessCheckoutBodyKeys } from "@/lib/billing/promotedAccessCheckoutBodyValidation";
import { isSupportedLang, type Lang } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function resolveCanonicalSiteUrl(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!fromEnv) return null;
  return fromEnv.replace(/\/$/, "");
}

function promotedAccessFailureToApi(
  reason: Extract<
    Awaited<ReturnType<typeof createPromotedAccessCheckout>>,
    { ok: false }
  >["reason"],
): { error: string; status: number } {
  switch (reason) {
    case "payments_unavailable":
      return { error: "payments_unavailable", status: 503 };
    case "not_eligible":
      return { error: "not_eligible", status: 403 };
    case "already_has_access":
      return { error: "already_has_access", status: 409 };
    case "subscription_access":
      return { error: "subscription_access", status: 409 };
    case "checkout_error":
      return { error: "checkout_error", status: 502 };
    case "db_error":
      return { error: "checkout_error", status: 502 };
    default:
      return { error: "checkout_error", status: 502 };
  }
}

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
  }

  const bodyRecord = body as Record<string, unknown>;
  const untrusted = findUntrustedPromotedAccessCheckoutBodyKeys(bodyRecord);
  if (untrusted.length > 0) {
    return NextResponse.json(
      { error: "untrusted_fields", fields: untrusted },
      { status: 400, headers: NO_STORE },
    );
  }

  const langRaw = bodyRecord.lang;
  if (typeof langRaw !== "string" || !isSupportedLang(langRaw.trim())) {
    return NextResponse.json({ error: "invalid_lang" }, { status: 400, headers: NO_STORE });
  }
  const lang = langRaw.trim() as Lang;

  const siteUrl = resolveCanonicalSiteUrl();
  if (!siteUrl) {
    return NextResponse.json(
      { error: "payments_unavailable" },
      { status: 503, headers: NO_STORE },
    );
  }

  const service = createServiceClient();
  const { data: specialist, error: specError } = await service
    .from("specialists")
    .select("id")
    .eq("user_id", user.id)
    .neq("status", "blocked")
    .maybeSingle();

  if (specError) {
    return NextResponse.json({ error: "checkout_error" }, { status: 502, headers: NO_STORE });
  }

  if (!specialist?.id) {
    return NextResponse.json({ error: "not_eligible" }, { status: 403, headers: NO_STORE });
  }

  const result = await createPromotedAccessCheckout({
    supabase: service,
    specialistId: specialist.id,
    userId: user.id,
    lang,
    siteUrl,
  });

  if (!result.ok) {
    const api = promotedAccessFailureToApi(result.reason);
    return NextResponse.json({ error: api.error }, { status: api.status, headers: NO_STORE });
  }

  return NextResponse.json({ checkout_url: result.checkoutUrl }, { status: 200, headers: NO_STORE });
}
