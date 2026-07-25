import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { applyPartnerSubscriptionCredit } from "@/lib/partners/credit";
import { PartnerDomainError } from "@/lib/partners/errors";
import { getPartnerForUser } from "@/lib/partners/session";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/**
 * Allocate confirmed partner reward balance to Freuly subscription credit.
 * Independent of PARTNER_PAYOUTS_ENABLED / Stripe Connect cash payouts.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await auth.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401, headers: NO_STORE });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
    }

    const amountRaw =
      typeof (body as { amount_cents?: unknown }).amount_cents === "number"
        ? (body as { amount_cents: number }).amount_cents
        : typeof (body as { amountCents?: unknown }).amountCents === "number"
          ? (body as { amountCents: number }).amountCents
          : null;

    const subscriptionDueCents =
      typeof (body as { subscription_due_cents?: unknown }).subscription_due_cents === "number"
        ? (body as { subscription_due_cents: number }).subscription_due_cents
        : typeof (body as { subscriptionDueCents?: unknown }).subscriptionDueCents === "number"
          ? (body as { subscriptionDueCents: number }).subscriptionDueCents
          : null;

    const service = createServiceClient();
    const partner = await getPartnerForUser(user.id, service);
    if (!partner) {
      return NextResponse.json({ error: "partner_not_bound" }, { status: 403, headers: NO_STORE });
    }

    const result = await applyPartnerSubscriptionCredit(service, {
      partnerId: partner.id,
      userId: user.id,
      amountCents: amountRaw,
      subscriptionDueCents,
      note:
        typeof (body as { note?: unknown }).note === "string"
          ? (body as { note: string }).note
          : null,
    });

    return NextResponse.json({ ok: true, ...result }, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof PartnerDomainError) {
      return NextResponse.json({ error: err.code }, { status: err.status, headers: NO_STORE });
    }
    console.error("[api/partner/credits/apply]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500, headers: NO_STORE });
  }
}
