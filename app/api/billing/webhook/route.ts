import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { claimBillingEvent, finishBillingEvent } from "@/lib/billing/billingEvents";
import {
  processStripeBillingWebhook,
  shouldMarkBillingEventSkipped,
  shouldRetryBillingWebhook,
} from "@/lib/billing/processStripeBillingWebhook";
import { getStripeClient } from "@/lib/billing/stripeClient";
import { getStripeWebhookSecret } from "@/lib/billing/stripeConfig";
import { PartnerDomainError } from "@/lib/partners/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function POST(request: NextRequest) {
  const webhookSecret = getStripeWebhookSecret();
  const stripe = getStripeClient();

  if (!webhookSecret || !stripe) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503, headers: NO_STORE });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400, headers: NO_STORE });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[billing/webhook] signature verification failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400, headers: NO_STORE });
  }

  const supabase = createSupabaseServerClient();
  let claim;
  try {
    claim = await claimBillingEvent(supabase, {
      providerEventId: event.id,
      eventType: event.type,
    });
  } catch (err) {
    console.error("[billing/webhook] event claim failed", err);
    return NextResponse.json({ error: "event_claim_failed" }, { status: 500, headers: NO_STORE });
  }

  if (claim.action === "noop") {
    return NextResponse.json({ received: true, duplicate: true }, { status: 200, headers: NO_STORE });
  }

  try {
    const result = await processStripeBillingWebhook(supabase, event);

    if (shouldRetryBillingWebhook(result)) {
      throw new Error("promoted_fulfillment_incomplete");
    }

    const skipped = shouldMarkBillingEventSkipped(result);
    await finishBillingEvent(supabase, claim.rowId, {
      status: skipped ? "skipped" : "processed",
    });
    return NextResponse.json(
      {
        received: true,
        event_type: event.type,
        partner: result.partner.partnerCommission?.outcome ?? null,
        promoted: result.promoted.outcome,
      },
      { status: 200, headers: NO_STORE },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "processing_failed";
    console.error("[billing/webhook] processing error", event.id, event.type, message);
    await finishBillingEvent(supabase, claim.rowId, {
      status: "failed",
      error: message,
    });

    // Transient failures (e.g. fee not yet available) — 503 so Stripe retries.
    const status = err instanceof PartnerDomainError && err.status === 503 ? 503 : 500;
    return NextResponse.json({ error: "processing_failed" }, { status, headers: NO_STORE });
  }
}
