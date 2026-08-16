import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DASHBOARD_LEAD_FULL_SELECT,
  DASHBOARD_LEAD_REDACTED_SELECT,
  mapRowToDashboardLead,
} from "@/lib/leads/contactUnlock";
import { sendEmail } from "@/lib/email";
import {
  assertClientSafeSpecialistLeadDto,
  buildSpecialistLeadPaginationOrFilter,
  decodeSpecialistLeadCursor,
  encodeSpecialistLeadCursor,
  isAllowedSpecialistLeadStatusFilter,
  mapDashboardLeadToApiItem,
  normalizeSpecialistLeadLimit,
} from "@/lib/specialistLeads/mapper";
import { SPECIALIST_LEAD_STATUSES, type SpecialistLeadApiItem, type SpecialistLeadListPage } from "@/lib/specialistLeads/types";

function toApiItem(row: Record<string, unknown>): SpecialistLeadApiItem {
  return assertClientSafeSpecialistLeadDto(
    mapDashboardLeadToApiItem(mapRowToDashboardLead(row)),
  );
}

export async function listSpecialistLeads(
  service: SupabaseClient,
  specialistId: string,
  params: { limit?: unknown; cursor?: unknown; status?: unknown },
): Promise<SpecialistLeadListPage> {
  const limit = normalizeSpecialistLeadLimit(params.limit);
  const cursor = decodeSpecialistLeadCursor(params.cursor);
  const statusFilter =
    typeof params.status === "string" && params.status.trim() && params.status.trim() !== "all"
      ? params.status.trim()
      : null;

  if (statusFilter && !isAllowedSpecialistLeadStatusFilter(statusFilter)) {
    throw new Error("invalid_status_filter");
  }

  let query = service
    .from("leads")
    .select(DASHBOARD_LEAD_REDACTED_SELECT)
    .eq("specialist_id", specialistId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(limit + 1);

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  if (cursor) {
    query = query.or(buildSpecialistLeadPaginationOrFilter(cursor));
  }

  const { data, error } = await query;

  if (error) {
    console.error("[specialistLeads/service] list failed", error.message);
    throw new Error("lead_list_failed");
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const pageRows = rows.slice(0, limit);
  const items = pageRows.map((row) => toApiItem(row));

  if (rows.length <= limit || pageRows.length === 0) {
    return { items, next_cursor: null };
  }

  const last = pageRows[pageRows.length - 1];
  const createdAt = typeof last.created_at === "string" ? last.created_at : null;
  const id = String(last.id);

  if (!createdAt) {
    return { items, next_cursor: null };
  }

  return {
    items,
    next_cursor: encodeSpecialistLeadCursor({ created_at: createdAt, id }),
  };
}

export async function getSpecialistLeadById(
  service: SupabaseClient,
  specialistId: string,
  leadId: string,
): Promise<SpecialistLeadApiItem | null> {
  const { data, error } = await service
    .from("leads")
    .select(DASHBOARD_LEAD_REDACTED_SELECT)
    .eq("id", leadId)
    .eq("specialist_id", specialistId)
    .maybeSingle();

  if (error) {
    console.error("[specialistLeads/service] detail failed", error.message);
    throw new Error("lead_detail_failed");
  }

  if (!data) {
    return null;
  }

  return toApiItem(data as Record<string, unknown>);
}

export async function updateSpecialistLeadStatus(
  service: SupabaseClient,
  specialistId: string,
  leadId: string,
  nextStatus: string,
): Promise<SpecialistLeadApiItem | null> {
  if (!SPECIALIST_LEAD_STATUSES.includes(nextStatus as (typeof SPECIALIST_LEAD_STATUSES)[number])) {
    throw new Error("invalid_status");
  }

  const { data: existing, error: fetchError } = await service
    .from("leads")
    .select(DASHBOARD_LEAD_REDACTED_SELECT)
    .eq("id", leadId)
    .eq("specialist_id", specialistId)
    .maybeSingle();

  if (fetchError) {
    console.error("[specialistLeads/service] status prefetch failed", fetchError.message);
    throw new Error("lead_status_failed");
  }

  if (!existing) {
    return null;
  }

  const currentStatus = typeof existing.status === "string" ? existing.status : null;
  if (currentStatus === nextStatus) {
    return toApiItem(existing as Record<string, unknown>);
  }

  let updateQuery = service
    .from("leads")
    .update({ status: nextStatus })
    .eq("id", leadId)
    .eq("specialist_id", specialistId);

  if (currentStatus === null) {
    updateQuery = updateQuery.is("status", null);
  } else {
    updateQuery = updateQuery.eq("status", currentStatus);
  }

  const { data, error } = await updateQuery.select(DASHBOARD_LEAD_REDACTED_SELECT).maybeSingle();

  if (error) {
    console.error("[specialistLeads/service] status update failed", error.message);
    throw new Error("lead_status_failed");
  }

  if (data) {
    return toApiItem(data as Record<string, unknown>);
  }

  const { data: refetched, error: refetchError } = await service
    .from("leads")
    .select(DASHBOARD_LEAD_REDACTED_SELECT)
    .eq("id", leadId)
    .eq("specialist_id", specialistId)
    .maybeSingle();

  if (refetchError || !refetched) {
    throw new Error("lead_status_conflict");
  }

  const refetchedStatus = typeof refetched.status === "string" ? refetched.status : null;
  if (refetchedStatus === nextStatus) {
    return toApiItem(refetched as Record<string, unknown>);
  }

  throw new Error("lead_status_conflict");
}

export async function unlockSpecialistLeadContacts(
  service: SupabaseClient,
  specialistId: string,
  leadId: string,
  actorUserId: string,
): Promise<SpecialistLeadApiItem | null> {
  const { data: existing, error: fetchError } = await service
    .from("leads")
    .select(DASHBOARD_LEAD_FULL_SELECT)
    .eq("id", leadId)
    .eq("specialist_id", specialistId)
    .maybeSingle();

  if (fetchError) {
    console.error("[specialistLeads/service] unlock fetch failed", fetchError.message);
    throw new Error("lead_unlock_failed");
  }

  if (!existing) {
    return null;
  }

  const mapped = mapRowToDashboardLead(existing as Record<string, unknown>);
  if (mapped.contacts_unlocked) {
    return toApiItem(existing as Record<string, unknown>);
  }

  const nowIso = new Date().toISOString();
  const { data: updated, error: updateError } = await service
    .from("leads")
    .update({
      contact_unlocked_at: nowIso,
      contact_unlocked_by: actorUserId,
    })
    .eq("id", leadId)
    .eq("specialist_id", specialistId)
    .is("contact_unlocked_at", null)
    .select(DASHBOARD_LEAD_FULL_SELECT)
    .maybeSingle();

  if (updateError) {
    console.error("[specialistLeads/service] unlock update failed", updateError.message);
    throw new Error("lead_unlock_failed");
  }

  let resultRow = updated as Record<string, unknown> | null;
  const didPersistFirstUnlock = Boolean(updated);

  if (!resultRow) {
    const { data: refetched } = await service
      .from("leads")
      .select(DASHBOARD_LEAD_FULL_SELECT)
      .eq("id", leadId)
      .eq("specialist_id", specialistId)
      .maybeSingle();

    if (!refetched) {
      throw new Error("lead_unlock_failed");
    }

    resultRow = refetched as Record<string, unknown>;
  }

  const resultMapped = mapRowToDashboardLead(resultRow);
  if (didPersistFirstUnlock && resultMapped.client_email) {
    try {
      await sendEmail({
        to: resultMapped.client_email,
        subject: "Специалист готов связаться с вами",
        html: "<p>Здравствуйте!</p><p>Специалист открыл вашу заявку и свяжется с вами в ближайшее время.</p>",
      });
    } catch (emailErr) {
      console.error("[specialistLeads/service] client email failed", emailErr);
    }
  }

  return toApiItem(resultRow);
}
