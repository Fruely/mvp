import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { PartnerDomainError } from "@/lib/partners/errors";
import { markPartnerNotificationsRead } from "@/lib/partners/notifications";
import { requirePartnerApiSession } from "@/lib/partners/session";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function POST(request: NextRequest) {
  try {
    const session = await requirePartnerApiSession();
    const body = await request.json().catch(() => ({}));
    const ids =
      body && typeof body === "object" && Array.isArray((body as { ids?: unknown }).ids)
        ? ((body as { ids: unknown[] }).ids.filter((x) => typeof x === "string") as string[])
        : null;

    const supabase = createServiceClient();
    const updated = await markPartnerNotificationsRead(supabase, {
      partnerId: session.partner.id,
      userId: session.user.id,
      notificationIds: ids,
    });

    return NextResponse.json({ updated }, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof PartnerDomainError) {
      return NextResponse.json({ error: err.code }, { status: err.status, headers: NO_STORE });
    }
    console.error("[api/partner/notifications/read]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500, headers: NO_STORE });
  }
}
