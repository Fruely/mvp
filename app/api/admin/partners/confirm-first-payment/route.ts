import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import { PartnerDomainError } from "@/lib/partners/errors";
import { confirmFirstPaymentCommission } from "@/lib/partners/commissions";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/**
 * Interim commission source while Stripe webhooks are not live.
 * Does NOT consult specialist_plan. Requires explicit externalPaymentReference.
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
      typeof body.specialistId === "string"
        ? body.specialistId
        : typeof body.specialist_id === "string"
          ? body.specialist_id
          : "";
    const externalPaymentReference =
      typeof body.externalPaymentReference === "string"
        ? body.externalPaymentReference
        : typeof body.external_payment_reference === "string"
          ? body.external_payment_reference
          : "";
    const paidAt =
      typeof body.paidAt === "string"
        ? body.paidAt
        : typeof body.paid_at === "string"
          ? body.paid_at
          : null;

    // Never accept client-supplied commission amount.
    if ("amount_cents" in body || "amount" in body || "commission_amount_cents" in body) {
      return NextResponse.json(
        { error: "amount_not_accepted" },
        { status: 400, headers: NO_STORE }
      );
    }

    const supabase = createSupabaseServerClient();
    const result = await confirmFirstPaymentCommission(supabase, {
      specialistId,
      externalPaymentReference,
      paidAt,
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
