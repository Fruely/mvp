"use server";

import { revalidatePath } from "next/cache";
import {
  closePromotionAdmin,
  publishPromotionAdmin,
  savePromotionDraftAdmin,
  type ServiceRequestPromotionAdmin,
} from "@/lib/serviceRequests/promotionAdminData";
import {
  generatePromotionDraftAdmin,
  type GeneratedPromotionDraft,
} from "@/lib/serviceRequests/promotionDraftGenerator";

export type PromotionActionResult =
  | { ok: true; promotion: ServiceRequestPromotionAdmin }
  | { ok: false; error: string };

export type GeneratePromotionDraftActionResult =
  | { ok: true; draft: GeneratedPromotionDraft }
  | { ok: false; error: string };

function errorCode(err: unknown): string {
  const message = err instanceof Error ? err.message : "UNKNOWN";
  if (message === "UNAUTHORIZED") return "unauthorized";
  if (message === "NOT_FOUND") return "not_found";
  if (message === "INVALID_INPUT") return "invalid_input";
  if (message === "ALREADY_EXISTS") return "already_exists";
  if (message === "TRANSLATION_FAILED") return "translation_failed";
  if (message.startsWith("PROMOTION_GENERATION_")) return "generation_failed";
  return "server_error";
}

function mapError(err: unknown): PromotionActionResult {
  return { ok: false, error: errorCode(err) };
}

function revalidateAdminServiceRequests() {
  revalidatePath("/admin/service-requests");
}

export async function generatePromotionDraftAction(
  serviceRequestId: string,
): Promise<GeneratePromotionDraftActionResult> {
  try {
    const draft = await generatePromotionDraftAdmin(serviceRequestId);
    return { ok: true, draft };
  } catch (err) {
    return { ok: false, error: errorCode(err) };
  }
}

export async function savePromotionDraftAction(
  serviceRequestId: string,
  input: {
    locale: string;
    public_title: string;
    public_summary: string;
  },
): Promise<PromotionActionResult> {
  try {
    const promotion = await savePromotionDraftAdmin(serviceRequestId, input);
    revalidateAdminServiceRequests();
    return { ok: true, promotion };
  } catch (err) {
    return mapError(err);
  }
}

export async function publishPromotionAction(
  serviceRequestId: string,
): Promise<PromotionActionResult> {
  try {
    const promotion = await publishPromotionAdmin(serviceRequestId);
    revalidateAdminServiceRequests();
    return { ok: true, promotion };
  } catch (err) {
    return mapError(err);
  }
}

export async function closePromotionAction(
  serviceRequestId: string,
): Promise<PromotionActionResult> {
  try {
    const promotion = await closePromotionAdmin(serviceRequestId);
    revalidateAdminServiceRequests();
    return { ok: true, promotion };
  } catch (err) {
    return mapError(err);
  }
}
