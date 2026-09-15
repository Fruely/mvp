import { NextRequest, NextResponse } from "next/server";
import { createRequestOfferCheckout } from "@/lib/billing/createRequestOfferCheckout";
import { isSupportedLang, type Lang } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;
const ALLOWED_BODY_KEYS = new Set(["offer_id", "lang"]);

function resolveCanonicalSiteUrl(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return fromEnv ? fromEnv.replace(/\/$/, "") : null;
}

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  const auth = createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await auth.auth.getUser();

  if (authError || !user?.id) return fail("unauthorized", 401);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return fail("invalid_json", 400);
  }

  const record = body as Record<string, unknown>;
  const untrusted = Object.keys(record).filter((key) => !ALLOWED_BODY_KEYS.has(key));
  if (untrusted.length > 0) {
    return NextResponse.json(
      { error: "untrusted_fields", fields: untrusted },
      { status: 400, headers: NO_STORE },
    );
  }

  const offerId = typeof record.offer_id === "string" ? record.offer_id.trim() : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(offerId)) {
    return fail("invalid_offer", 400);
  }

  const langRaw = typeof record.lang === "string" ? record.lang.trim() : "";
  if (!isSupportedLang(langRaw)) return fail("invalid_lang", 400);
  const lang = langRaw as Lang;

  const siteUrl = resolveCanonicalSiteUrl();
  if (!siteUrl) return fail("payments_unavailable", 503);

  const service = createServiceClient();
  const { data: specialist, error: specialistError } = await service
    .from("specialists")
    .select("id")
    .eq("user_id", user.id)
    .neq("status", "blocked")
    .maybeSingle();

  if (specialistError) return fail("checkout_error", 502);
  if (!specialist?.id) return fail("not_eligible", 403);

  const result = await createRequestOfferCheckout({
    supabase: service,
    specialistId: specialist.id,
    userId: user.id,
    offerId,
    lang,
    siteUrl,
  });

  if (!result.ok) {
    switch (result.reason) {
      case "payments_unavailable":
        return fail("payments_unavailable", 503);
      case "not_eligible":
        return fail("not_eligible", 403);
      case "already_has_access":
        return fail("already_has_access", 409);
      case "subscription_access":
        return fail("subscription_access", 409);
      case "offer_unavailable":
        return fail("offer_unavailable", 409);
      case "db_error":
      case "checkout_error":
      default:
        return fail("checkout_error", 502);
    }
  }

  return NextResponse.json(
    { checkout_url: result.checkoutUrl },
    { status: 200, headers: NO_STORE },
  );
}
