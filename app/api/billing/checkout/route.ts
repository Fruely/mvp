import { NextRequest, NextResponse } from "next/server";
import { checkoutFailureToApi } from "@/lib/billing/checkoutErrors";
import {
  createCheckoutSessionForSpecialist,
  findUntrustedCheckoutBodyKeys,
  type CreateCheckoutResult,
} from "@/lib/billing/createCheckoutSession";
import type { PlanPaymentCheckoutResult } from "@/lib/billing/createPlanPaymentCheckout";
import { parseCheckoutReturnTarget } from "@/lib/billing/checkoutReturnTarget";
import { planPaymentFailureToApi } from "@/lib/billing/planPaymentErrors";
import { isManualRenewalEnabled } from "@/lib/billing/featureFlags";
import { isSupportedLang, type Lang } from "@/lib/i18n";
import {
  resolveSpecialistLeadSession,
  specialistLeadSessionErrorCode,
  specialistLeadSessionErrorStatus,
} from "@/lib/specialistLeads/session";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import type { CheckoutSessionResult } from "@/lib/billing/paymentProvider";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function resolveSiteUrl(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

function isManualPaymentSuccess(
  result: CreateCheckoutResult,
): result is Extract<CreateCheckoutResult, { ok: true }> & { mode: "payment"; checkoutUrl: string } {
  return result.ok === true && result.mode === "payment" && typeof result.checkoutUrl === "string";
}

export async function POST(request: NextRequest) {
  const session = await resolveSpecialistLeadSession(request);
  if (session.kind !== "ok") {
    return NextResponse.json(
      { error: specialistLeadSessionErrorCode(session) },
      { status: specialistLeadSessionErrorStatus(session), headers: NO_STORE },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
  }

  const bodyRecord = body as Record<string, unknown>;
  const untrusted = findUntrustedCheckoutBodyKeys(bodyRecord);
  if (untrusted.length > 0) {
    return NextResponse.json(
      { error: "untrusted_fields", fields: untrusted },
      { status: 400, headers: NO_STORE },
    );
  }

  const planCodeRaw = "plan_code" in bodyRecord ? bodyRecord.plan_code : null;
  const langRaw = "lang" in bodyRecord && typeof bodyRecord.lang === "string" ? bodyRecord.lang : "ua";
  const returnTarget = parseCheckoutReturnTarget(
    "return_target" in bodyRecord ? bodyRecord.return_target : undefined,
  );

  if (returnTarget === null) {
    return NextResponse.json({ error: "invalid_return_target" }, { status: 400, headers: NO_STORE });
  }

  if (isManualRenewalEnabled()) {
    if (!isSupportedLang(langRaw.trim())) {
      return NextResponse.json({ error: "invalid_lang" }, { status: 400, headers: NO_STORE });
    }
  }

  const lang = langRaw.trim() as Lang;

  const service = createServiceClient();
  const { data: specialist, error: specError } = await service
    .from("specialists")
    .select("name, email")
    .eq("id", session.specialistId)
    .maybeSingle();

  if (specError) {
    return NextResponse.json({ error: "specialist_not_found" }, { status: 403, headers: NO_STORE });
  }

  console.info("[billing/checkout] requested", {
    specialistId: session.specialistId,
    manualRenewal: isManualRenewalEnabled(),
    returnTarget,
  });

  const result = await createCheckoutSessionForSpecialist({
    supabase: service,
    specialistId: session.specialistId,
    userId: session.userId,
    userEmail: specialist?.email ?? null,
    userName: typeof specialist?.name === "string" ? specialist.name : null,
    planCodeRaw,
    lang,
    siteUrl: resolveSiteUrl(request),
    returnTarget,
  });

  if (!result.ok) {
    if (isManualRenewalEnabled()) {
      const api = planPaymentFailureToApi(
        result as Extract<PlanPaymentCheckoutResult, { ok: false }>,
      );
      return NextResponse.json({ error: api.error }, { status: api.status, headers: NO_STORE });
    }
    const api = checkoutFailureToApi(
      result as Extract<CheckoutSessionResult, { ok: false }>,
    );
    return NextResponse.json({ error: api.error }, { status: api.status, headers: NO_STORE });
  }

  if (isManualPaymentSuccess(result)) {
    return NextResponse.json(
      {
        checkout_url: result.checkoutUrl,
        url: result.checkoutUrl,
        provider: result.provider ?? "stripe",
        mode: result.mode,
      },
      { status: 200, headers: NO_STORE },
    );
  }

  return NextResponse.json(
    {
      url: result.url,
      ...(result.provider ? { provider: result.provider } : {}),
      ...(result.mode ? { mode: result.mode } : {}),
    },
    { status: 200, headers: NO_STORE },
  );
}
