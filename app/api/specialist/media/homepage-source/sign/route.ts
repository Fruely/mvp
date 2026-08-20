import { NextRequest, NextResponse } from "next/server";

import { resolveSpecialistMediaContext } from "@/lib/specialistMedia/context";
import { handleHomepageSourceSignRequest } from "@/lib/specialistMedia/signHomepageSource";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function POST(request: NextRequest) {
  const result = await handleHomepageSourceSignRequest(request, resolveSpecialistMediaContext);
  return NextResponse.json(result.body, { status: result.status, headers: NO_STORE });
}
