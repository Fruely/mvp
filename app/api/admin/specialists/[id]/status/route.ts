import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminToken } from "@/lib/adminApiAuth";

const ALLOWED_STATUSES = new Set([
  "draft",
  "published_unverified",
  "featured_verified",
  "blocked",
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResponse = requireAdminToken(request);
  if (authResponse) return authResponse;

  const specialistId = params?.id;
  if (!specialistId) {
    return NextResponse.json({ error: "Missing specialist id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const nextStatus = typeof body?.status === "string" ? body.status.trim() : "";
  const featuredPriority =
    typeof body?.featured_priority === "number" && Number.isFinite(body.featured_priority)
      ? Math.max(0, Math.trunc(body.featured_priority))
      : null;

  if (!ALLOWED_STATUSES.has(nextStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    status: nextStatus,
    is_active: nextStatus === "blocked" ? false : true,
    is_visible: nextStatus === "blocked" ? false : true,
    blocked_reason: nextStatus === "blocked" ? (typeof body?.blocked_reason === "string" ? body.blocked_reason.trim() || null : null) : null,
  };

  if (nextStatus === "featured_verified") {
    patch.featured_at = new Date().toISOString();
    patch.featured_priority = featuredPriority ?? 0;
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("specialists")
    .update(patch)
    .eq("id", specialistId)
    .select("id, status, featured_priority, is_active, is_visible")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Failed to update specialist status" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data }, { status: 200 });
}
