import { NextRequest, NextResponse } from "next/server";

import {
  buildNativeBillingDeepLink,
  parseCheckoutReturnOutcome,
} from "@/lib/billing/checkoutReturnTarget";
import { parsePaidPlanCode } from "@/lib/billing/plans";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/**
 * Server-owned Stripe → Native bounce.
 * Query values are enums only. This redirect is not payment authority.
 */
export async function GET(request: NextRequest) {
  const checkout = parseCheckoutReturnOutcome(request.nextUrl.searchParams.get("checkout"));
  const planCode = parsePaidPlanCode(request.nextUrl.searchParams.get("plan"));
  const target = request.nextUrl.searchParams.get("target")?.trim().toLowerCase();

  if (!checkout || !planCode || target !== "native") {
    return NextResponse.json({ error: "invalid_return" }, { status: 400, headers: NO_STORE });
  }

  const location = buildNativeBillingDeepLink({ checkout, planCode });
  return new NextResponse(null, {
    status: 302,
    headers: {
      ...NO_STORE,
      Location: location,
    },
  });
}
