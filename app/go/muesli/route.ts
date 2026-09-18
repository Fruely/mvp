import { type NextRequest, NextResponse } from "next/server";
import { buildPaidRequestPath } from "@/lib/serviceRequests/paidRequestEntry";
import { NEMETSKIE_MUSLI_UTM } from "@/lib/serviceRequests/paidRequestShortLinks";

export function GET(request: NextRequest) {
  const destination = new URL(buildPaidRequestPath("ru", NEMETSKIE_MUSLI_UTM), request.url);
  return NextResponse.redirect(destination, { status: 307 });
}
