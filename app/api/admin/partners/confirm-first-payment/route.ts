import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import { PartnerDomainError } from "@/lib/partners/errors";
import {
  confirmFirstPaymentCommission,
  parsePaymentFinancialFacts,
} from "@/lib/partners/commissions";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/**
 * LEGACY / emergency admin fallback — not the canonical commission source.
 *
 * Canonical production path: Stripe invoice.paid → createCommissionFromStripeInvoice.
 * This route remains for manual recovery/backfill when webhook data must be replayed
 * without duplicating Stripe-side commission creation.
 *
 * Requires admin auth + idempotency by source_event_id. Does NOT accept precomputed reward
 * amounts and does NOT use partners.commission_amount_cents.
 */
export async function POST(request: NextRequest) {
  const auth = requireAdminToken(request);
  if (auth) return auth;

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
    }

    const specialistId =
      typeof (body as { specialistId?: unknown }).specialistId === "string"
        ? (body as { specialistId: string }).specialistId
        : typeof (body as { specialist_id?: unknown }).specialist_id === "string"
          ? (body as { specialist_id: string }).specialist_id
          : "";
    const externalPaymentReference =
      typeof (body as { externalPaymentReference?: unknown }).externalPaymentReference ===
      "string"
        ? (body as { externalPaymentReference: string }).externalPaymentReference
        : typeof (body as { external_payment_reference?: unknown })
              .external_payment_reference === "string"
          ? (body as { external_payment_reference: string }).external_payment_reference
          : "";

    // Never accept client-supplied final reward amount.
    if (
      "amount_cents" in body ||
      "amount" in body ||
      "commission_amount_cents" in body ||
      "reward_cents" in body
    ) {
      return NextResponse.json(
        { error: "amount_not_accepted" },
        { status: 400, headers: NO_STORE }
      );
    }

    const facts = parsePaymentFinancialFacts(body as Record<string, unknown>);

    const supabase = createSupabaseServerClient();
    const result = await confirmFirstPaymentCommission(supabase, {
      specialistId,
      externalPaymentReference,
      paidAt: facts.paidAt,
      grossAmountCents: facts.grossAmountCents,
      vatAmountCents: facts.vatAmountCents,
      providerFeeCents: facts.providerFeeCents,
      billingInterval: facts.billingInterval,
    });

    return NextResponse.json(
      {
        created: result.created,
        commission: {
          id: result.commission.id,
          partner_id: result.commission.partner_id,
          specialist_id: result.commission.specialist_id,
          source_type: result.commission.source_type,
          source_event_id: result.commission.source_event_id,
          amount_cents: result.commission.amount_cents,
          currency: result.commission.currency,
          status: result.commission.status,
          earned_at: result.commission.earned_at,
          approved_at: result.commission.approved_at,
        },
      },
      { status: result.created ? 201 : 200, headers: NO_STORE }
    );
  } catch (err) {
    if (err instanceof PartnerDomainError) {
      return NextResponse.json({ error: err.code }, { status: err.status, headers: NO_STORE });
    }
    console.error("[admin/partners/confirm-first-payment]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500, headers: NO_STORE });
  }
}
