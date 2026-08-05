"use server";

import { revalidatePath } from "next/cache";
import { updateServiceRequestStatusAdmin } from "@/lib/serviceRequests/adminData";

export type UpdateStatusResult =
  | { ok: true; status: string }
  | { ok: false; error: string };

export async function updateServiceRequestStatusAction(
  id: string,
  status: string,
): Promise<UpdateStatusResult> {
  try {
    const data = await updateServiceRequestStatusAdmin(id, status);
    revalidatePath("/admin/service-requests");
    return { ok: true, status: data.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN";
    if (message === "UNAUTHORIZED") return { ok: false, error: "unauthorized" };
    if (message === "INVALID_STATUS") return { ok: false, error: "invalid_status" };
    if (message === "NOT_FOUND") return { ok: false, error: "not_found" };
    return { ok: false, error: "server_error" };
  }
}
