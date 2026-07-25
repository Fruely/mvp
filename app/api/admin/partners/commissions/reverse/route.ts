import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import { PartnerDomainError } from "@/lib/partners/errors";
import { reverseCommissionForInvalidPayment } from "@/lib/partners/commissions";
import type { PaymentValidityStatus } from "@/lib/partners/commissionValidation";

const NO_STORE = { "Cache-Control": "no-store" } as const;

const INVALID: ReadonlyArray<Exclude<PaymentValidityStatus, "valid">> = [
  "cancelled",
  "refunded",
  "reversed",
  "disputed",
];

/**
 * Mark a pending/approved commission reversed when the underlying payment
 * is cancelled / refunded / reversed / disputed (validation-period risk).
 */
export async function POST(request: NextRequest) {
  const auth = requireAdminToken(request);
  if (auth) return auth;

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
    }

    const commissionId =
      typeof (body as { commissionId?: unknown }).commissionId === "string"
        ? (body as { commissionId: string }).commissionId.trim()
        : typeof (body as { commission_id?: unknown }).commission_id === "string"
          ? (body as { commission_id: string }).commission_id.trim()
          : "";

    const paymentStatusRaw =
      typeof (body as { paymentStatus?: unknown }).paymentStatus === "string"
        ? (body as { paymentStatus: string }).paymentStatus
        : typeof (body as { payment_status?: unknown }).payment_status === "string"
          ? (body as { payment_status: string }).payment_status
          : "";

    if (!commissionId) {
      return NextResponse.json({ error: "commission_id_required" }, { status: 400, headers: NO_STORE });
    }
    if (!INVALID.includes(paymentStatusRaw as Exclude<PaymentValidityStatus, "valid">)) {
      return NextResponse.json({ error: "invalid_payment_status" }, { status: 400, headers: NO_STORE });
    }

    const supabase = createSupabaseServerClient();
    const commission = await reverseCommissionForInvalidPayment(supabase, {
      commissionId,
      paymentStatus: paymentStatusRaw as Exclude<PaymentValidityStatus, "valid">,
      actorLabel: "admin_token",
      reason:
        typeof (body as { reason?: unknown }).reason === "string"
          ? (body as { reason: string }).reason
          : undefined,
    });

    return NextResponse.json(
      {
        ok: true,
        commission: {
          id: commission.id,
          status: commission.status,
          reversed_at: commission.reversed_at,
          reversal_reason: commission.reversal_reason,
        },
      },
      { headers: NO_STORE }
    );
  } catch (err) {
    if (err instanceof PartnerDomainError) {
      return NextResponse.json({ error: err.code }, { status: err.status, headers: NO_STORE });
    }
    console.error("[admin/partners/commissions/reverse]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500, headers: NO_STORE });
  }
}
