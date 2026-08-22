import type { SpecialistProPageDraftRow } from "@/lib/specialists/proPage/types";

export type ProPagePublishValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

function nonEmpty(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateProPageForPublish(
  draft: Pick<
    SpecialistProPageDraftRow,
    | "profession_label"
    | "positioning"
    | "client_requests"
    | "work_process"
    | "why_me"
  >,
): ProPagePublishValidationResult {
  const errors: string[] = [];

  if (!nonEmpty(draft.profession_label)) {
    errors.push("profession_label_required");
  }
  if (!nonEmpty(draft.positioning)) {
    errors.push("positioning_required");
  }
  if (!Array.isArray(draft.client_requests) || draft.client_requests.length < 3) {
    errors.push("client_requests_min_3");
  }
  if (!Array.isArray(draft.work_process) || draft.work_process.length < 3) {
    errors.push("work_process_min_3");
  }
  if (!Array.isArray(draft.why_me) || draft.why_me.length < 2) {
    errors.push("why_me_min_2");
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
