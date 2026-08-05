"use server";

import { revalidatePath } from "next/cache";
import {
  closePromotionAdmin,
  publishPromotionAdmin,
  savePromotionDraftAdmin,
  type ServiceRequestPromotionAdmin,
} from "@/lib/serviceRequests/promotionAdminData";

export type PromotionActionResult =
  | { ok: true; promotion: ServiceRequestPromotionAdmin }
  | { ok: false; error: string };

function mapError(err: unknown): PromotionActionResult {
  const message = err instanceof Error ? err.message : "UNKNOWN";
  if (message === "UNAUTHORIZED") return { ok: false, error: "unauthorized" };
  if (message === "NOT_FOUND") return { ok: false, error: "not_found" };
  if (message === "INVALID_INPUT") return { ok: false, error: "invalid_input" };
  if (message === "ALREADY_EXISTS") return { ok: false, error: "already_exists" };
  return { ok: false, error: "server_error" };
}

function revalidateAdminServiceRequests() {
  revalidatePath("/admin/service-requests");
}

export async function savePromotionDraftAction(
  serviceRequestId: string,
  input: { locale: string; public_title: string; public_summary: string },
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
