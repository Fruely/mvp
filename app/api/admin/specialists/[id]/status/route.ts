import { NextRequest, NextResponse } from "next/server";
import {
  checkPublishableCategory,
  hasValidServiceForPublish,
} from "@/lib/dashboard/publicationReadiness";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import { assertSpecialistCanBePublished } from "@/lib/specialists/publicationGeography";

const ALLOWED_STATUSES = new Set([
  "draft",
  "published_unverified",
  "featured_verified",
  "blocked",
]);

const PUBLISHED_STATUSES = new Set(["published_unverified", "featured_verified"]);

async function validateAdminPublishReadiness(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  specialistId: string,
): Promise<NextResponse | null> {
  const { data: specialist, error: specialistError } = await supabase
    .from("specialists")
    .select("id, name, category_id, languages, work_format, postal_code")
    .eq("id", specialistId)
    .maybeSingle();

  if (specialistError) {
    return NextResponse.json({ error: "Failed to load specialist for readiness check" }, { status: 500 });
  }
  if (!specialist) {
    return NextResponse.json({ error: "Specialist not found" }, { status: 404 });
  }

  const missing: string[] = [];
  const name = typeof specialist.name === "string" ? specialist.name.trim() : "";
  const categoryId = typeof specialist.category_id === "string" ? specialist.category_id.trim() : "";
  const languages = Array.isArray(specialist.languages)
    ? specialist.languages.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
  const workFormat = typeof specialist.work_format === "string" ? specialist.work_format : "";

  if (!name) missing.push("name");
  if (!categoryId) missing.push("category_id");
  if (languages.length === 0) missing.push("languages");
  if (workFormat !== "online" && workFormat !== "offline" && workFormat !== "hybrid") {
    missing.push("work_format");
  }

  if (missing.length > 0) {
    return NextResponse.json(
      { error: "SPECIALIST_NOT_READY_FOR_PUBLICATION", fields: missing },
      { status: 400 },
    );
  }

  const geoCheck = await assertSpecialistCanBePublished(supabase, specialistId);
  if (!geoCheck.ok) {
    return NextResponse.json(
      {
        error: "SPECIALIST_NOT_READY_FOR_PUBLICATION",
        code: geoCheck.code,
        fields: [geoCheck.code],
      },
      { status: 400 },
    );
  }

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, parent_id, slug")
    .eq("id", categoryId)
    .maybeSingle();

  if (categoryError) {
    return NextResponse.json({ error: "Failed to validate category" }, { status: 500 });
  }

  const categoryCheck = checkPublishableCategory(category);
  if (!categoryCheck.ok) {
    return NextResponse.json(
      { error: "INVALID_SPECIALIST_CATEGORY", reason: categoryCheck.reason },
      { status: 400 },
    );
  }

  const { data: services, error: servicesError } = await supabase
    .from("specialist_services")
    .select("title, price_from, price_to, pricing_type, price_comment, pricing_exception, is_active")
    .eq("specialist_id", specialistId)
    .eq("category_id", categoryId)
    .eq("is_active", true);

  if (servicesError) {
    return NextResponse.json({ error: "Failed to validate services" }, { status: 500 });
  }

  if (!hasValidServiceForPublish(services ?? [])) {
    return NextResponse.json(
      { error: "SPECIALIST_NOT_READY_FOR_PUBLICATION", fields: ["services"] },
      { status: 400 },
    );
  }

  return null;
}

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

  const supabase = createSupabaseServerClient();

  if (PUBLISHED_STATUSES.has(nextStatus)) {
    const readinessError = await validateAdminPublishReadiness(supabase, specialistId);
    if (readinessError) return readinessError;
  }

  const isPublishedStatus = PUBLISHED_STATUSES.has(nextStatus);
  const patch: Record<string, unknown> = {
    status: nextStatus,
    is_active: isPublishedStatus,
    is_visible: isPublishedStatus,
    blocked_reason: nextStatus === "blocked" ? (typeof body?.blocked_reason === "string" ? body.blocked_reason.trim() || null : null) : null,
  };

  if (isPublishedStatus) {
    patch.published_at = new Date().toISOString();
  }

  if (nextStatus === "featured_verified") {
    patch.is_featured = true;
    patch.featured_at = new Date().toISOString();
    patch.featured_priority = featuredPriority ?? 0;
  } else {
    patch.is_featured = false;
    patch.featured_priority = 0;
    patch.featured_at = null;
  }

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
