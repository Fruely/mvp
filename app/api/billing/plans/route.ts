import { NextResponse } from "next/server";

import { listPublicCommercialPlans } from "@/lib/billing/planCatalog";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET() {
  return NextResponse.json({ items: listPublicCommercialPlans() }, { status: 200, headers: NO_STORE });
}
