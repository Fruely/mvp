import { NextResponse, type NextRequest } from "next/server";
import { countUnreadInbox } from "@/lib/inbox/unread";
import { requirePushUser } from "@/lib/push/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const auth = await requirePushUser(request);
  if ("status" in auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  const count = await countUnreadInbox(createSupabaseServerClient(), auth.userId);
  return NextResponse.json({ count: Math.max(0, count) }, { status: 200, headers: NO_STORE });
}
