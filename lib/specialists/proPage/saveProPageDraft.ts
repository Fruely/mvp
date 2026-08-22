import type { SupabaseClient } from "@supabase/supabase-js";
import { parseProPageSectionItems } from "@/lib/specialists/proPage/entitlement";
import {
  PRO_PAGE_DRAFT_SELECT,
  mapProPageDraftRowFromDb,
  mapDraftRowToEditorPayload,
} from "@/lib/specialists/proPage/rowMapping";
import type { ProPageSectionItem } from "@/lib/specialists/proPage/types";

function hasOwn<T extends object>(obj: T, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function nullableTrimmedString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseSectionItemsField(value: unknown): ProPageSectionItem[] | undefined {
  if (value === undefined) return undefined;
  return parseProPageSectionItems(value);
}

export type SaveProPageDraftInput = {
  display_name?: string | null;
  profession_label?: string | null;
  positioning?: string | null;
  story?: string | null;
  client_language?: string | null;
  client_requests?: unknown;
  work_process?: unknown;
  why_me?: unknown;
  why_me_image_url?: string | null;
  final_cta_image_url?: string | null;
};

export type SaveProPageDraftResult =
  | { ok: true; draft: ReturnType<typeof mapDraftRowToEditorPayload> }
  | { ok: false; status: number; error: string };

export async function saveProPageDraft(
  service: SupabaseClient,
  specialistId: string,
  input: SaveProPageDraftInput,
): Promise<SaveProPageDraftResult> {
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (hasOwn(input, "display_name")) {
    patch.display_name = nullableTrimmedString(input.display_name);
  }
  if (hasOwn(input, "profession_label")) {
    patch.profession_label = nullableTrimmedString(input.profession_label);
  }
  if (hasOwn(input, "positioning")) {
    patch.positioning = nullableTrimmedString(input.positioning);
  }
  if (hasOwn(input, "story")) {
    patch.story = nullableTrimmedString(input.story);
  }
  if (hasOwn(input, "client_language")) {
    patch.client_language = nullableTrimmedString(input.client_language);
  }
  if (hasOwn(input, "why_me_image_url")) {
    patch.why_me_image_url = nullableTrimmedString(input.why_me_image_url);
  }
  if (hasOwn(input, "final_cta_image_url")) {
    patch.final_cta_image_url = nullableTrimmedString(input.final_cta_image_url);
  }

  const clientRequests = parseSectionItemsField(input.client_requests);
  if (clientRequests !== undefined) {
    patch.client_requests = clientRequests;
  }
  const workProcess = parseSectionItemsField(input.work_process);
  if (workProcess !== undefined) {
    patch.work_process = workProcess;
  }
  const whyMe = parseSectionItemsField(input.why_me);
  if (whyMe !== undefined) {
    patch.why_me = whyMe;
  }

  const { data, error } = await service
    .from("specialist_pro_page_drafts")
    .update(patch)
    .eq("specialist_id", specialistId)
    .select(PRO_PAGE_DRAFT_SELECT)
    .maybeSingle();

  if (error?.code === "42P01" || error?.message?.includes("specialist_pro_page_drafts")) {
    return { ok: false, status: 503, error: "pro_drafts_unavailable" };
  }
  if (error) {
    console.error("[proPage/draft] save failed", error);
    return { ok: false, status: 500, error: "save_failed" };
  }
  if (!data) {
    return { ok: false, status: 404, error: "draft_not_found" };
  }

  const row = mapProPageDraftRowFromDb(data as Record<string, unknown>);
  if (!row) {
    return { ok: false, status: 500, error: "invalid_draft_row" };
  }

  return { ok: true, draft: mapDraftRowToEditorPayload(row) };
}
