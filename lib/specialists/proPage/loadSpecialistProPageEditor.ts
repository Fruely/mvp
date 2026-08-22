import type { SupabaseClient } from "@supabase/supabase-js";
import { isPublishedProPage } from "@/lib/specialists/proPage/entitlement";
import { loadSpecialistProEntitlement } from "@/lib/specialists/proPage/loadProEntitlement";
import {
  PRO_PAGE_DRAFT_SELECT,
  PRO_PAGE_PUBLISHED_SELECT,
  buildDraftInsertFromPublished,
  buildEmptyDraftInsert,
  mapDraftRowToEditorPayload,
  mapProPageDraftRowFromDb,
  mapProPageRowFromDb,
} from "@/lib/specialists/proPage/rowMapping";
import type { ProPageEditorBundle } from "@/lib/specialists/proPage/types";
import { getSpecialistUrl } from "@/lib/publicUrls";

function isMissingDraftTable(error: { code?: string; message?: string } | null): boolean {
  return (
    error?.code === "42P01" ||
    Boolean(error?.message?.includes("specialist_pro_page_drafts"))
  );
}

export async function loadSpecialistProPageEditor(
  service: SupabaseClient,
  specialistId: string,
  lang: "ru" | "ua" | "de",
): Promise<ProPageEditorBundle | null> {
  const [entitlement, draftResult, publishedResult, specialistResult] = await Promise.all([
    loadSpecialistProEntitlement(specialistId),
    service
      .from("specialist_pro_page_drafts")
      .select(PRO_PAGE_DRAFT_SELECT)
      .eq("specialist_id", specialistId)
      .maybeSingle(),
    service
      .from("specialist_pro_pages")
      .select(PRO_PAGE_PUBLISHED_SELECT)
      .eq("specialist_id", specialistId)
      .maybeSingle(),
    service.from("specialists").select("id, slug").eq("id", specialistId).maybeSingle(),
  ]);

  if (isMissingDraftTable(draftResult.error)) {
    return null;
  }

  if (draftResult.error) {
    console.error("[proPage/editor] draft lookup failed", draftResult.error);
    return null;
  }
  if (publishedResult.error) {
    console.error("[proPage/editor] published lookup failed", publishedResult.error);
  }

  const published = publishedResult.data
    ? mapProPageRowFromDb(publishedResult.data as Record<string, unknown>)
    : null;
  const hasPublishedPage = isPublishedProPage(published);

  let draftRow = draftResult.data
    ? mapProPageDraftRowFromDb(draftResult.data as Record<string, unknown>)
    : null;

  if (!draftRow) {
    const insertPayload = published
      ? buildDraftInsertFromPublished(specialistId, published)
      : buildEmptyDraftInsert(specialistId);

    const { data: inserted, error: insertError } = await service
      .from("specialist_pro_page_drafts")
      .insert(insertPayload)
      .select(PRO_PAGE_DRAFT_SELECT)
      .single();

    if (insertError) {
      console.error("[proPage/editor] draft bootstrap failed", insertError);
      return null;
    }

    draftRow = mapProPageDraftRowFromDb(inserted as Record<string, unknown>);
  }

  if (!draftRow) {
    return null;
  }

  const slug =
    typeof specialistResult.data?.slug === "string" && specialistResult.data.slug.trim()
      ? specialistResult.data.slug.trim()
      : specialistId;

  return {
    draft: mapDraftRowToEditorPayload(draftRow),
    hasPublishedPage,
    publicPath: hasPublishedPage ? getSpecialistUrl(lang, { id: specialistId, slug }) : null,
    publicSlug: slug,
    entitlementActive: entitlement?.is_active === true,
  };
}
