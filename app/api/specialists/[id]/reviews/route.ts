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

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await Promise.resolve(params);

    if (!id || typeof id !== "string" || id.trim().length === 0) {
      return jsonNoStore({ error: "Specialist id is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return jsonNoStore({ error: "Invalid request body" }, { status: 400 });
    }

    const authorName = typeof body.author_name === "string" ? body.author_name.trim().slice(0, 100) : "";
    const rating = typeof body.rating === "number" ? Math.round(body.rating) : 0;
    const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 1000) : "";

    if (!authorName) {
      return jsonNoStore({ error: "author_name is required (max 100 chars)" }, { status: 400 });
    }
    if (rating < 1 || rating > 5) {
      return jsonNoStore({ error: "rating must be an integer between 1 and 5" }, { status: 400 });
    }
    if (!comment) {
      return jsonNoStore({ error: "comment is required (max 1000 chars)" }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from("specialist_reviews")
      .insert({
        specialist_id: id.trim(),
        author_name: authorName,
        rating,
        comment,
        is_visible: true,
      })
      .select("id, author_name, rating, comment, created_at")
      .single();

    if (error) {
      return jsonNoStore({ error: "Failed to create review" }, { status: 500 });
    }

    return jsonNoStore({ data }, { status: 201 });
  } catch {
    return jsonNoStore({ error: "Internal server error" }, { status: 500 });
  }
}
