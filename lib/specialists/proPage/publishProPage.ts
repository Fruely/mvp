import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PRO_PAGE_DRAFT_SELECT,
  buildPublishedUpsertFromDraft,
  mapProPageDraftRowFromDb,
  mapDraftRowToEditorPayload,
} from "@/lib/specialists/proPage/rowMapping";
import { validateProPageForPublish } from "@/lib/specialists/proPage/validateProPageForPublish";

export type PublishProPageResult =
  | {
      ok: true;
      draft: ReturnType<typeof mapDraftRowToEditorPayload>;
      publishedAt: string;
    }
  | { ok: false; status: number; error: string; validationErrors?: string[] };

export async function publishProPage(
  service: SupabaseClient,
  specialistId: string,
): Promise<PublishProPageResult> {
  const { data: draftData, error: draftError } = await service
    .from("specialist_pro_page_drafts")
    .select(PRO_PAGE_DRAFT_SELECT)
    .eq("specialist_id", specialistId)
    .maybeSingle();

  if (draftError?.code === "42P01" || draftError?.message?.includes("specialist_pro_page_drafts")) {
    return { ok: false, status: 503, error: "pro_drafts_unavailable" };
  }
  if (draftError) {
    console.error("[proPage/publish] draft lookup failed", draftError);
    return { ok: false, status: 500, error: "draft_lookup_failed" };
  }
  if (!draftData) {
    return { ok: false, status: 404, error: "draft_not_found" };
  }

  const draftRow = mapProPageDraftRowFromDb(draftData as Record<string, unknown>);
  if (!draftRow) {
    return { ok: false, status: 500, error: "invalid_draft_row" };
  }

  const validation = validateProPageForPublish(draftRow);
  if (!validation.ok) {
    return {
      ok: false,
      status: 422,
      error: "validation_failed",
      validationErrors: validation.errors,
    };
  }

  const upsertPayload = buildPublishedUpsertFromDraft(specialistId, draftRow);
  const { error: publishError } = await service
    .from("specialist_pro_pages")
    .upsert(upsertPayload, { onConflict: "specialist_id" });

  if (publishError) {
    console.error("[proPage/publish] upsert failed", publishError);
    return { ok: false, status: 500, error: "publish_failed" };
  }

  return {
    ok: true,
    draft: mapDraftRowToEditorPayload(draftRow),
    publishedAt: typeof upsertPayload.published_at === "string" ? upsertPayload.published_at : new Date().toISOString(),
  };
}
