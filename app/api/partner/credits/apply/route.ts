import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { applyPartnerCommissionCredit } from "@/lib/partners/credit";
import { PartnerDomainError } from "@/lib/partners/errors";
import { getPartnerForUser } from "@/lib/partners/session";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/**
 * Apply approved partner commission as Freuly credit (partial allowed, idempotent).
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

    const commissionRef =
      typeof (body as { commission_ref?: unknown }).commission_ref === "string"
        ? (body as { commission_ref: string }).commission_ref.trim()
        : typeof (body as { commissionRef?: unknown }).commissionRef === "string"
          ? (body as { commissionRef: string }).commissionRef.trim()
          : "";

    const amountCents =
      typeof (body as { amount_cents?: unknown }).amount_cents === "number"
        ? (body as { amount_cents: number }).amount_cents
        : typeof (body as { amountCents?: unknown }).amountCents === "number"
          ? (body as { amountCents: number }).amountCents
          : NaN;

    const idempotencyKey =
      typeof (body as { idempotency_key?: unknown }).idempotency_key === "string"
        ? (body as { idempotency_key: string }).idempotency_key.trim()
        : typeof (body as { idempotencyKey?: unknown }).idempotencyKey === "string"
          ? (body as { idempotencyKey: string }).idempotencyKey.trim()
          : "";

    if (!commissionRef) {
      return NextResponse.json({ error: "commission_ref_required" }, { status: 400, headers: NO_STORE });
    }
    if (!idempotencyKey) {
      return NextResponse.json(
        { error: "idempotency_key_required" },
        { status: 400, headers: NO_STORE }
      );
    }

    const service = createServiceClient();
    const partner = await getPartnerForUser(user.id, service);
    if (!partner) {
      return NextResponse.json({ error: "partner_not_bound" }, { status: 403, headers: NO_STORE });
    }

    const result = await applyPartnerCommissionCredit(service, {
      partnerId: partner.id,
      userId: user.id,
      commissionRef,
      amountCents,
      idempotencyKey,
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
