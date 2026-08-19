import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import { assertSpecialistCanBePublished } from "@/lib/specialists/publicationGeography";
import { ensureCanonicalSpecialistSlug } from "@/lib/specialists/ensureCanonicalSpecialistSlug";

type ModerationAction = "approve" | "feature" | "deactivate";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResponse = requireAdminToken(request);
  if (authResponse) return authResponse;

  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { error: "Missing specialist id" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const body = await request.json().catch(() => null);
    const action = body?.action as ModerationAction | undefined;
    if (!action || !["approve", "feature", "deactivate"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const supabase = createSupabaseServerClient();

    if (action === "approve" || action === "feature") {
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

      const slugResult = await ensureCanonicalSpecialistSlug(supabase, id);
      if (!slugResult.ok) {
        return NextResponse.json(
          { error: "SLUG_GENERATION_FAILED", reason: slugResult.reason },
          { status: 400, headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    let patch: Record<string, unknown> = {};
    if (action === "approve") {
      patch = {
        is_verified: true,
        is_approved: true,
        approved_at: new Date().toISOString(),
        is_featured: true,
        featured_at: new Date().toISOString(),
        featured_priority: 0,
        is_active: true,
        is_visible: true,
        status: "featured_verified",
      };
    } else if (action === "feature") {
      patch = {
        is_featured: true,
        featured_at: new Date().toISOString(),
        status: "featured_verified",
        is_active: true,
        is_visible: true,
      };
    } else if (action === "deactivate") {
      patch = {
        status: "blocked",
        is_active: false,
        is_visible: false,
      };
    }

    const { data, error } = await supabase
      .from("specialists")
      .update(patch)
      .eq("id", id)
      .select("id, status, is_featured")
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
    console.error("[admin] specialist moderation failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
