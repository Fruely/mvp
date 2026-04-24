import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";
import {
  checkRateLimit,
  getClientIP,
  RATE_LIMIT_PUBLIC_MESSAGE,
} from "@/lib/rate-limit/shared";

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
      console.error("[specialists/reviews] GET failed", error);
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

    const authorName =
      typeof body.author_name === "string" ? body.author_name.trim().slice(0, 80) : "";
    const rawRating = body.rating;
    const rating =
      typeof rawRating === "number" && Number.isInteger(rawRating) ? rawRating : null;
    const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 2000) : "";

    if (!authorName) {
      return jsonNoStore(
        { error: "author_name is required (max 80 chars)" },
        { status: 400 }
      );
    }
    if (rating === null || rating < 1 || rating > 5) {
      return jsonNoStore(
        { error: "rating must be an integer between 1 and 5" },
        { status: 400 }
      );
    }
    if (!comment) {
      return jsonNoStore(
        { error: "comment is required (max 2000 chars)" },
        { status: 400 }
      );
    }

    const specialistId = id.trim();
    const ip = getClientIP(request);
    const rl = await checkRateLimit(request, {
      namespace: "specialist_review:ip_specialist",
      identifier: `${ip}:${specialistId}`,
      limit: 10,
      windowSeconds: 900,
    });
    if (!rl.allowed) {
      return jsonNoStore(
        { error: RATE_LIMIT_PUBLIC_MESSAGE },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSec ?? 60) },
        }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data: specialist, error: specLookupError } = await supabase
      .from("specialists")
      .select("id")
      .eq("id", specialistId)
      .in("status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
      .eq("is_active", true)
      .eq("is_visible", true)
      .maybeSingle();

    if (specLookupError) {
      console.error("[specialists/reviews] specialist lookup failed", specLookupError);
      return jsonNoStore({ error: "Failed to submit review" }, { status: 500 });
    }

    if (!specialist?.id) {
      return jsonNoStore({ error: "Specialist not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("specialist_reviews")
      .insert({
        specialist_id: specialistId,
        author_name: authorName,
        rating,
        comment,
        is_visible: false,
      })
      .select("id, author_name, rating, comment, created_at")
      .single();

    if (error) {
      console.error("[specialists/reviews] insert failed", error);
      return jsonNoStore({ error: "Failed to submit review" }, { status: 500 });
    }

    return jsonNoStore({ data }, { status: 201 });
  } catch {
    return jsonNoStore({ error: "Internal server error" }, { status: 500 });
  }
}
