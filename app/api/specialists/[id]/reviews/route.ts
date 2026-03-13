import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await Promise.resolve(params);

    if (!id || typeof id !== "string" || id.trim().length === 0) {
      return jsonNoStore({ error: "Specialist id is required" }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from("specialist_reviews")
      .select("id, author_name, rating, comment, created_at")
      .eq("specialist_id", id.trim())
      .eq("is_visible", true)
      .order("created_at", { ascending: false });

    if (error) {
      return jsonNoStore({ error: "Failed to load reviews" }, { status: 500 });
    }

    return jsonNoStore({ data: data ?? [] });
  } catch {
    return jsonNoStore({ error: "Internal server error" }, { status: 500 });
  }
}
