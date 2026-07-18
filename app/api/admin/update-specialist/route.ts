import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import { assertSpecialistCanBePublished } from "@/lib/specialists/publicationGeography";

type Action = "verify" | "feature" | "activate" | "deactivate";

const PUBLISHED_STATUSES = new Set(["published_unverified", "featured_verified"]);

export async function POST(request: NextRequest) {
  const authResponse = requireAdminToken(request);
  if (authResponse) return authResponse;

  try {
    const body = await request.json().catch(() => null);
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    const action = typeof body?.action === "string" ? (body.action as Action) : null;
    const isActive = typeof body?.is_active === "boolean" ? body.is_active : null;

    if (!id) {
      return NextResponse.json(
        { error: "Missing specialist id" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!action || !["verify", "feature", "activate", "deactivate"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const patch: Record<string, unknown> = {};
    const supabase = createSupabaseServerClient();

    const { data: current, error: currentError } = await supabase
      .from("specialists")
      .select("status, is_active, is_visible")
      .eq("id", id)
      .maybeSingle();

    if (currentError) {
      return NextResponse.json(
        { error: "Failed to load specialist" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (!current) {
      return NextResponse.json(
        { error: "Specialist not found" },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    const currentStatus = typeof current.status === "string" ? current.status : null;
    const isPublished = currentStatus != null && PUBLISHED_STATUSES.has(currentStatus);

    if ((action === "verify" || action === "feature") && !isPublished) {
      return NextResponse.json(
        {
          error:
            action === "feature"
              ? "Премиум-показ можно включить только для уже опубликованного специалиста."
              : "Верифицировать можно только уже опубликованного специалиста.",
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (action === "verify") {
      patch.is_verified = true;
      patch.is_approved = true;
      patch.approved_at = new Date().toISOString();
      patch.is_active = true;
      patch.is_visible = true;
      // Verification is not the same as premium placement.
      // Keep the current publication status unless the specialist is already premium.
      patch.status = currentStatus === "featured_verified" ? "featured_verified" : "published_unverified";
    }

    if (action === "feature") {
      patch.is_featured = true;
      patch.is_verified = true;
      patch.is_approved = true;
      patch.featured_at = new Date().toISOString();
      patch.status = "featured_verified";
      patch.is_active = true;
      patch.is_visible = true;
    }

    if (action === "activate") {
      if (typeof isActive !== "boolean") {
        return NextResponse.json(
          { error: "is_active must be boolean for activate action" },
          { status: 400, headers: { "Cache-Control": "no-store" } }
        );
      }
      if (isActive && currentStatus === "draft") {
        return NextResponse.json(
          { error: "Нельзя активировать черновик. Специалист должен сначала опубликовать профиль." },
          { status: 400, headers: { "Cache-Control": "no-store" } }
        );
      }
      patch.is_active = isActive;
      patch.is_visible = isActive;
      if (isActive) {
        // Do not downgrade verified/featured specialists on re-activation.
        // Only restore blocked specialists to the baseline published status.
        if (currentStatus === "blocked") {
          patch.status = "published_unverified";
        }
      }
    }

    if (action === "deactivate") {
      patch.is_active = false;
      patch.is_visible = false;
      patch.status = "blocked";
    }

    // Public transitions (verify/feature/reactivate) must satisfy geography invariant.
    const makesPublic =
      action === "verify" ||
      action === "feature" ||
      (action === "activate" && isActive === true);
    if (makesPublic) {
      const geoCheck = await assertSpecialistCanBePublished(supabase, id);
      if (!geoCheck.ok) {
        return NextResponse.json(
          {
            error: "SPECIALIST_NOT_READY_FOR_PUBLICATION",
            code: geoCheck.code,
            fields: [geoCheck.code],
          },
          { status: 400, headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    const { data, error } = await supabase
      .from("specialists")
      .update(patch)
      .eq("id", id)
      .select("id, status, is_active, is_visible, is_featured, is_verified")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Failed to update specialist moderation" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { success: true, data },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[admin] update-specialist failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}