import { NextRequest, NextResponse } from "next/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import { listCategoriesForCampaignAdmin } from "@/lib/clientCampaignLinks/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(request: NextRequest) {
  const auth = requireAdminToken(request);
  if (auth) return auth;

  try {
    const supabase = createSupabaseServerClient();
    const categories = await listCategoriesForCampaignAdmin(supabase);
    return NextResponse.json({ categories }, { headers: NO_STORE });
  } catch (err) {
    console.error("[admin/campaign-links/categories]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500, headers: NO_STORE });
  }
}
