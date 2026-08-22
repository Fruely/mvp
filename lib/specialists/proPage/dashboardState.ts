import type { SupabaseClient } from "@supabase/supabase-js";
import { hasActiveProEntitlement, isPublishedProPage } from "@/lib/specialists/proPage/entitlement";
import { loadSpecialistProEntitlement } from "@/lib/specialists/proPage/loadProEntitlement";
import { mapProPageRowFromDb } from "@/lib/specialists/proPage/rowMapping";
import { getSpecialistUrl } from "@/lib/publicUrls";

export type ProPageDashboardCta = "create" | "finish" | "edit";

export type ProPageDashboardState = {
  hasActiveEntitlement: true;
  hasPublishedPage: boolean;
  hasDraftRow: boolean;
  primaryCta: ProPageDashboardCta;
  editorHref: string;
  publicHref: string | null;
};

export async function loadProPageDashboardState(
  service: SupabaseClient,
  specialistId: string,
  lang: string,
  slug: string | null | undefined,
): Promise<ProPageDashboardState | null> {
  const entitlement = await loadSpecialistProEntitlement(specialistId);
  if (!hasActiveProEntitlement(entitlement)) {
    return null;
  }

  const [draftResult, publishedResult] = await Promise.all([
    service
      .from("specialist_pro_page_drafts")
      .select("specialist_id")
      .eq("specialist_id", specialistId)
      .maybeSingle(),
    service
      .from("specialist_pro_pages")
      .select("specialist_id, status")
      .eq("specialist_id", specialistId)
      .maybeSingle(),
  ]);

  if (draftResult.error?.code === "42P01") {
    return null;
  }

  const published = publishedResult.data
    ? mapProPageRowFromDb({
        ...(publishedResult.data as Record<string, unknown>),
        display_name: null,
        profession_label: null,
        positioning: null,
        client_requests: [],
        work_process: [],
        why_me: [],
        story: null,
        client_language: null,
        why_me_image_url: null,
        final_cta_image_url: null,
        published_at: null,
        updated_at: new Date(0).toISOString(),
      })
    : null;

  const hasPublishedPage = isPublishedProPage(published);
  const hasDraftRow = Boolean(draftResult.data?.specialist_id);

  let primaryCta: ProPageDashboardCta = "create";
  if (hasPublishedPage) {
    primaryCta = "edit";
  } else if (hasDraftRow) {
    primaryCta = "finish";
  }

  const publicSlug = slug?.trim() || specialistId;
  const editorHref = `/${lang}/specialist/dashboard/pro-page`;

  return {
    hasActiveEntitlement: true,
    hasPublishedPage,
    hasDraftRow,
    primaryCta,
    editorHref,
    publicHref: hasPublishedPage
      ? getSpecialistUrl(lang as "ru" | "ua" | "de", { id: specialistId, slug: publicSlug })
      : null,
  };
}
