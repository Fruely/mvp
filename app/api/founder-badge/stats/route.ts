import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";

export const dynamic = "force-dynamic";

const CAP = 50;

/**
 * Public stats: how many founder badges issued and slots remaining.
 * GET /api/founder-badge/stats
 */
export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const { count, error } = await supabase
      .from("specialists")
      .select("*", { count: "exact", head: true })
      .eq("founder_badge", true)
      .in("status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
      .eq("is_active", true)
      .eq("is_visible", true)
      .or("is_test.is.null,is_test.eq.false");

    if (error) {
      return jsonNoStore({ error: error.message }, { status: 500 });
    }

    const used = typeof count === "number" ? count : 0;
    const left = Math.max(0, CAP - used);

    return jsonNoStore({
      cap: CAP,
      used,
      left,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return jsonNoStore({ error: msg }, { status: 500 });
  }
}
