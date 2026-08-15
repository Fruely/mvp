import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertAdminSession } from "@/lib/adminSession";
import {
  SERVICE_REQUEST_ADMIN_DETAIL_SELECT,
  SERVICE_REQUEST_LIST_SELECT,
  isAllowedAdminStatus,
} from "@/lib/serviceRequests/validation";

export type ServiceRequestListItem = {
  id: string;
  public_id: string;
  created_at: string | null;
  category_text: string | null;
  preferred_language: string | null;
  work_format: string | null;
  city: string | null;
  postal_code: string | null;
  urgency: string | null;
  desired_date?: string | null;
  service_timing_type?: string | null;
  service_timing_date?: string | null;
  service_timing_time?: string | null;
  service_timing_date_end?: string | null;
  service_timing_period?: string | null;
  service_timing_note?: string | null;
  status: string | null;
};

export type ServiceRequestDetail = ServiceRequestListItem & {
  description: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  desired_date: string | null;
  locale: string | null;
  source: string | null;
  source_path: string | null;
};

export async function listServiceRequestsAdmin(): Promise<ServiceRequestListItem[]> {
  await assertAdminSession();
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("service_requests")
    .select(SERVICE_REQUEST_LIST_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/service-requests] list failed", error);
    throw new Error("LIST_FAILED");
  }

  return (data ?? []) as ServiceRequestListItem[];
}

export async function getServiceRequestDetailAdmin(id: string): Promise<ServiceRequestDetail | null> {
  await assertAdminSession();
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("service_requests")
    .select(SERVICE_REQUEST_ADMIN_DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[admin/service-requests/detail] fetch failed", error);
    throw new Error("DETAIL_FAILED");
  }

  return (data as ServiceRequestDetail | null) ?? null;
}

export async function updateServiceRequestStatusAdmin(
  id: string,
  status: string,
): Promise<{ id: string; public_id: string; status: string; updated_at: string }> {
  await assertAdminSession();

  if (!isAllowedAdminStatus(status)) {
    throw new Error("INVALID_STATUS");
  }

  const supabase = createSupabaseServerClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("service_requests")
    .update({ status, updated_at: nowIso })
    .eq("id", id)
    .select("id, public_id, status, updated_at")
    .maybeSingle();

  if (error) {
    console.error("[admin/service-requests/status] update failed", error);
    throw new Error("UPDATE_FAILED");
  }

  if (!data) {
    throw new Error("NOT_FOUND");
  }

  return data as { id: string; public_id: string; status: string; updated_at: string };
}
