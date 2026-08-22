import { parseProPageSectionItems } from "@/lib/specialists/proPage/entitlement";
import type {
  ProPageSectionItem,
  ProPageStatus,
  ProPageEditorDraftPayload,
  PublicProPageContent,
  SpecialistProPageDraftRow,
  SpecialistProPageRow,
} from "@/lib/specialists/proPage/types";

export const PRO_PAGE_CONTENT_SELECT =
  "specialist_id, display_name, profession_label, positioning, client_requests, work_process, why_me, story, client_language, why_me_image_url, final_cta_image_url";

export const PRO_PAGE_PUBLISHED_SELECT = `${PRO_PAGE_CONTENT_SELECT}, status, published_at, updated_at`;

export const PRO_PAGE_DRAFT_SELECT = `${PRO_PAGE_CONTENT_SELECT}, created_at, updated_at`;

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function mapProPageContentFieldsFromDb(
  row: Record<string, unknown>,
): Omit<SpecialistProPageRow, "specialist_id" | "status" | "published_at" | "updated_at"> {
  return {
    display_name: nullableString(row.display_name),
    profession_label: nullableString(row.profession_label),
    positioning: nullableString(row.positioning),
    client_requests: parseProPageSectionItems(row.client_requests),
    work_process: parseProPageSectionItems(row.work_process),
    why_me: parseProPageSectionItems(row.why_me),
    story: nullableString(row.story),
    client_language: nullableString(row.client_language),
    why_me_image_url: nullableString(row.why_me_image_url),
    final_cta_image_url: nullableString(row.final_cta_image_url),
  };
}

export function mapProPageRowFromDb(row: Record<string, unknown>): SpecialistProPageRow | null {
  const specialistId = typeof row.specialist_id === "string" ? row.specialist_id : null;
  const status = row.status === "draft" || row.status === "published" ? (row.status as ProPageStatus) : null;
  if (!specialistId || !status) return null;
  return {
    specialist_id: specialistId,
    status,
    ...mapProPageContentFieldsFromDb(row),
    published_at: nullableString(row.published_at),
    updated_at: nullableString(row.updated_at) ?? new Date(0).toISOString(),
  };
}

export function mapProPageDraftRowFromDb(row: Record<string, unknown>): SpecialistProPageDraftRow | null {
  const specialistId = typeof row.specialist_id === "string" ? row.specialist_id : null;
  if (!specialistId) return null;
  return {
    specialist_id: specialistId,
    ...mapProPageContentFieldsFromDb(row),
    created_at: nullableString(row.created_at) ?? new Date(0).toISOString(),
    updated_at: nullableString(row.updated_at) ?? new Date(0).toISOString(),
  };
}

export function mapProPageRowToPublicContent(
  row: Pick<
    SpecialistProPageRow | SpecialistProPageDraftRow,
    | "display_name"
    | "profession_label"
    | "positioning"
    | "client_requests"
    | "work_process"
    | "why_me"
    | "story"
    | "client_language"
    | "why_me_image_url"
    | "final_cta_image_url"
  >,
): PublicProPageContent {
  return {
    displayName: row.display_name?.trim() || null,
    professionLabel: row.profession_label?.trim() || null,
    positioning: row.positioning?.trim() || null,
    clientRequests: parseProPageSectionItems(row.client_requests),
    workProcess: parseProPageSectionItems(row.work_process),
    whyMe: parseProPageSectionItems(row.why_me),
    story: row.story?.trim() || null,
    clientLanguage: row.client_language?.trim() || null,
    whyMeImageUrl: row.why_me_image_url?.trim() || null,
    finalCtaImageUrl: row.final_cta_image_url?.trim() || null,
  };
}

export function buildDraftInsertFromPublished(
  specialistId: string,
  published: Pick<
    SpecialistProPageRow,
    | "display_name"
    | "profession_label"
    | "positioning"
    | "client_requests"
    | "work_process"
    | "why_me"
    | "story"
    | "client_language"
    | "why_me_image_url"
    | "final_cta_image_url"
  >,
): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    specialist_id: specialistId,
    display_name: published.display_name,
    profession_label: published.profession_label,
    positioning: published.positioning,
    story: published.story,
    client_language: published.client_language,
    client_requests: published.client_requests,
    work_process: published.work_process,
    why_me: published.why_me,
    why_me_image_url: published.why_me_image_url,
    final_cta_image_url: published.final_cta_image_url,
    created_at: now,
    updated_at: now,
  };
}

export function buildEmptyDraftInsert(specialistId: string): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    specialist_id: specialistId,
    display_name: null,
    profession_label: null,
    positioning: null,
    story: null,
    client_language: null,
    client_requests: [],
    work_process: [],
    why_me: [],
    why_me_image_url: null,
    final_cta_image_url: null,
    created_at: now,
    updated_at: now,
  };
}

export function buildPublishedUpsertFromDraft(
  specialistId: string,
  draft: Pick<
    SpecialistProPageDraftRow,
    | "display_name"
    | "profession_label"
    | "positioning"
    | "client_requests"
    | "work_process"
    | "why_me"
    | "story"
    | "client_language"
    | "why_me_image_url"
    | "final_cta_image_url"
  >,
): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    specialist_id: specialistId,
    status: "published",
    display_name: draft.display_name,
    profession_label: draft.profession_label,
    positioning: draft.positioning,
    story: draft.story,
    client_language: draft.client_language,
    client_requests: draft.client_requests,
    work_process: draft.work_process,
    why_me: draft.why_me,
    why_me_image_url: draft.why_me_image_url,
    final_cta_image_url: draft.final_cta_image_url,
    published_at: now,
    updated_at: now,
  };
}

export function mapDraftRowToEditorPayload(row: SpecialistProPageDraftRow): ProPageEditorDraftPayload {
  const content = mapProPageRowToPublicContent(row);
  return {
    ...content,
    updatedAt: row.updated_at,
  };
}
