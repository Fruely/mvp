import { NextRequest, NextResponse } from "next/server";

import { resolveSpecialistMediaContext } from "@/lib/specialistMedia/context";
import { handleHomepagePhotoGenerateRequest } from "@/lib/specialistMedia/generateHomepagePhoto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function POST(request: NextRequest) {
  const result = await handleHomepagePhotoGenerateRequest(request, resolveSpecialistMediaContext);
  return NextResponse.json(result.body, { status: result.status, headers: NO_STORE });
}
