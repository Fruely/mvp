import type { SupabaseClient } from "@supabase/supabase-js";

import {
  PROTECTED_FROM_SELF_UNPUBLISH_STATUSES,
  SELF_UNPUBLISH_ALLOWED_STATUSES,
} from "@/lib/specialistDashboard/publicationStatus";

export type UnpublishSpecialistSuccess = {
  ok: true;
  status: "draft";
  alreadyPrivate?: boolean;
};

export type UnpublishSpecialistFailure = {
  ok: false;
  status: number;
  body: Record<string, unknown>;
};

export type UnpublishSpecialistResult = UnpublishSpecialistSuccess | UnpublishSpecialistFailure;

const DRAFT_PRIVATE_UPDATE = {
  status: "draft",
  is_active: false,
  is_visible: false,
  published_at: null,
  slug: null,
} as const;

export async function unpublishSpecialistProfile(
  service: SupabaseClient,
  specialistId: string,
): Promise<UnpublishSpecialistResult> {
  const { data: specialist, error: lookupError } = await service
    .from("specialists")
    .select("id, status")
    .eq("id", specialistId)
    .maybeSingle();

  if (lookupError) {
    console.error("[specialistDashboard/unpublish] lookup failed", lookupError.message);
    return { ok: false, status: 500, body: { error: "server_error" } };
  }

  if (!specialist?.id) {
    return { ok: false, status: 404, body: { error: "specialist_not_found" } };
  }

  const currentStatus = typeof specialist.status === "string" ? specialist.status : null;

  if (currentStatus === "draft") {
    return { ok: true, status: "draft", alreadyPrivate: true };
  }

  if (currentStatus && PROTECTED_FROM_SELF_UNPUBLISH_STATUSES.has(currentStatus)) {
    return {
      ok: false,
      status: 409,
      body: { error: "unpublish_not_allowed", code: "unpublish_not_allowed", status: currentStatus },
    };
  }

  if (!currentStatus || !SELF_UNPUBLISH_ALLOWED_STATUSES.has(currentStatus)) {
    return {
      ok: false,
      status: 409,
      body: {
        error: "unpublish_not_allowed",
        code: "unpublish_not_allowed",
        status: currentStatus ?? "unknown",
      },
    };
  }

  const { data: updated, error: updateError } = await service
    .from("specialists")
    .update({ ...DRAFT_PRIVATE_UPDATE })
    .eq("id", specialistId)
    .eq("status", "published_unverified")
    .select("id, status, is_active, is_visible, published_at, slug")
    .maybeSingle();

  if (updateError) {
    console.error("[specialistDashboard/unpublish] update failed", updateError.message);
    return { ok: false, status: 500, body: { error: "server_error" } };
  }

  if (!updated) {
    const { data: current } = await service
      .from("specialists")
      .select("status")
      .eq("id", specialistId)
      .maybeSingle();
    const status = typeof current?.status === "string" ? current.status : null;
    if (status === "draft") {
      return { ok: true, status: "draft", alreadyPrivate: true };
    }
    return {
      ok: false,
      status: 409,
      body: {
        error: "unpublish_not_allowed",
        code: "unpublish_not_allowed",
        status: status ?? "unknown",
      },
    };
  }

  return { ok: true, status: "draft" };
}
