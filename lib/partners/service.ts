import type { SupabaseClient } from "@supabase/supabase-js";
import { writePartnerAudit } from "@/lib/partners/audit";
import { validateReferralCode } from "@/lib/partners/codes";
import { PartnerDomainError } from "@/lib/partners/errors";
import { sanitizeTargetPath, defaultBecomeSpecialistPath } from "@/lib/partners/targetPath";
import type {
  PartnerCommissionRow,
  PartnerLinkRow,
  PartnerRow,
  PartnerStatus,
} from "@/lib/partners/types";

const ADMIN_ACTOR = "admin_token";

function nowIso(): string {
  return new Date().toISOString();
}

export async function createPartner(
  supabase: SupabaseClient,
  input: {
    name: string;
    email: string;
    referralCode: string;
    channelName?: string | null;
    channelUrl?: string | null;
    commissionAmountCents?: number;
    currency?: string;
    status?: PartnerStatus;
  }
): Promise<{ partner: PartnerRow; link: PartnerLinkRow }> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name || !email.includes("@")) {
    throw new PartnerDomainError("invalid_partner_fields");
  }

  const codeResult = validateReferralCode(input.referralCode);
  if (!codeResult.ok) throw new PartnerDomainError(codeResult.error);

  const amount = input.commissionAmountCents ?? 2900;
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new PartnerDomainError("invalid_commission_amount");
  }

  const currency = (input.currency ?? "EUR").trim().toUpperCase();
  if (currency.length !== 3) throw new PartnerDomainError("invalid_currency");

  const status: PartnerStatus = input.status ?? "pending";
  const ts = nowIso();

  const { data: partner, error } = await supabase
    .from("partners")
    .insert({
      name,
      email,
      channel_name: input.channelName?.trim() || null,
      channel_url: input.channelUrl?.trim() || null,
      referral_code: codeResult.code,
      status,
      commission_amount_cents: amount,
      currency,
      approved_at: status === "active" ? ts : null,
      created_at: ts,
      updated_at: ts,
    })
    .select("*")
    .single();

  if (error || !partner) {
    if (error?.code === "23505") throw new PartnerDomainError("referral_code_taken", 409);
    console.error("[partners] createPartner", error?.message);
    throw new PartnerDomainError("partner_create_failed", 500);
  }

  const { data: link, error: linkError } = await supabase
    .from("partner_links")
    .insert({
      partner_id: partner.id,
      code: codeResult.code,
      campaign: "default",
      target_path: defaultBecomeSpecialistPath("ua"),
      is_active: status === "active",
      created_at: ts,
      updated_at: ts,
    })
    .select("*")
    .single();

  if (linkError || !link) {
    console.error("[partners] default link create", linkError?.message);
    throw new PartnerDomainError("partner_link_create_failed", 500);
  }

  await writePartnerAudit(supabase, {
    actorLabel: ADMIN_ACTOR,
    action: "partner_created",
    entityType: "partner",
    entityId: partner.id,
    partnerId: partner.id,
    payload: {
      referral_code: codeResult.code,
      status,
      commission_amount_cents: amount,
    },
  });

  return { partner: partner as PartnerRow, link: link as PartnerLinkRow };
}

export async function setPartnerStatus(
  supabase: SupabaseClient,
  partnerId: string,
  status: PartnerStatus
): Promise<PartnerRow> {
  const ts = nowIso();
  const patch: Record<string, unknown> = {
    status,
    updated_at: ts,
  };
  if (status === "active") {
    patch.approved_at = ts;
    patch.disabled_at = null;
  }
  if (status === "disabled" || status === "paused" || status === "rejected") {
    patch.disabled_at = status === "disabled" ? ts : null;
  }

  const { data, error } = await supabase
    .from("partners")
    .update(patch)
    .eq("id", partnerId)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    throw new PartnerDomainError("partner_not_found", 404);
  }

  // Keep default link active flag aligned with partner active status
  await supabase
    .from("partner_links")
    .update({ is_active: status === "active", updated_at: ts })
    .eq("partner_id", partnerId)
    .eq("code", data.referral_code);

  await writePartnerAudit(supabase, {
    actorLabel: ADMIN_ACTOR,
    action: "partner_status_changed",
    entityType: "partner",
    entityId: partnerId,
    partnerId,
    payload: { status },
  });

  return data as PartnerRow;
}

export async function updatePartnerCommissionRate(
  supabase: SupabaseClient,
  partnerId: string,
  commissionAmountCents: number
): Promise<PartnerRow> {
  if (!Number.isInteger(commissionAmountCents) || commissionAmountCents <= 0) {
    throw new PartnerDomainError("invalid_commission_amount");
  }

  const { data: existing, error: findErr } = await supabase
    .from("partners")
    .select("*")
    .eq("id", partnerId)
    .maybeSingle();

  if (findErr || !existing) throw new PartnerDomainError("partner_not_found", 404);

  const oldAmount = existing.commission_amount_cents as number;
  const { data, error } = await supabase
    .from("partners")
    .update({
      commission_amount_cents: commissionAmountCents,
      updated_at: nowIso(),
    })
    .eq("id", partnerId)
    .select("*")
    .single();

  if (error || !data) throw new PartnerDomainError("partner_update_failed", 500);

  await writePartnerAudit(supabase, {
    actorLabel: ADMIN_ACTOR,
    action: "partner_rate_changed",
    entityType: "partner",
    entityId: partnerId,
    partnerId,
    payload: { old_amount_cents: oldAmount, new_amount_cents: commissionAmountCents },
  });

  return data as PartnerRow;
}

export async function createPartnerLink(
  supabase: SupabaseClient,
  input: {
    partnerId: string;
    code: string;
    campaign?: string | null;
    targetPath?: string | null;
    isActive?: boolean;
  }
): Promise<PartnerLinkRow> {
  if (!input.partnerId.trim()) throw new PartnerDomainError("partner_id_required");
  const codeResult = validateReferralCode(input.code);
  if (!codeResult.ok) throw new PartnerDomainError(codeResult.error);

  const target =
    sanitizeTargetPath(input.targetPath ?? defaultBecomeSpecialistPath("ua")) ??
    defaultBecomeSpecialistPath("ua");

  const { data: partner } = await supabase
    .from("partners")
    .select("id, status")
    .eq("id", input.partnerId)
    .maybeSingle();
  if (!partner) throw new PartnerDomainError("partner_not_found", 404);

  const ts = nowIso();
  const { data, error } = await supabase
    .from("partner_links")
    .insert({
      partner_id: input.partnerId,
      code: codeResult.code,
      campaign: input.campaign?.trim() || null,
      target_path: target,
      is_active: input.isActive ?? true,
      created_at: ts,
      updated_at: ts,
    })
    .select("*")
    .single();

  if (error || !data) {
    if (error?.code === "23505") throw new PartnerDomainError("referral_code_taken", 409);
    throw new PartnerDomainError("partner_link_create_failed", 500);
  }

  await writePartnerAudit(supabase, {
    actorLabel: ADMIN_ACTOR,
    action: "partner_link_created",
    entityType: "partner_link",
    entityId: data.id,
    partnerId: input.partnerId,
    payload: { code: codeResult.code, target_path: target },
  });

  return data as PartnerLinkRow;
}

export async function setPartnerLinkActive(
  supabase: SupabaseClient,
  linkId: string,
  isActive: boolean
): Promise<PartnerLinkRow> {
  const { data, error } = await supabase
    .from("partner_links")
    .update({ is_active: isActive, updated_at: nowIso() })
    .eq("id", linkId)
    .select("*")
    .maybeSingle();

  if (error || !data) throw new PartnerDomainError("partner_link_not_found", 404);

  await writePartnerAudit(supabase, {
    actorLabel: ADMIN_ACTOR,
    action: isActive ? "partner_link_enabled" : "partner_link_disabled",
    entityType: "partner_link",
    entityId: linkId,
    partnerId: data.partner_id,
    payload: { is_active: isActive },
  });

  return data as PartnerLinkRow;
}

export async function findActiveLinkByCode(
  supabase: SupabaseClient,
  code: string
): Promise<{ link: PartnerLinkRow; partner: PartnerRow } | null> {
  const codeResult = validateReferralCode(code);
  if (!codeResult.ok) return null;

  const { data: link } = await supabase
    .from("partner_links")
    .select("*")
    .eq("code", codeResult.code)
    .eq("is_active", true)
    .maybeSingle();

  if (!link) {
    // Fallback: partner primary code with active status
    const { data: partner } = await supabase
      .from("partners")
      .select("*")
      .eq("referral_code", codeResult.code)
      .eq("status", "active")
      .maybeSingle();
    if (!partner) return null;

    const { data: defaultLink } = await supabase
      .from("partner_links")
      .select("*")
      .eq("partner_id", partner.id)
      .eq("code", partner.referral_code)
      .maybeSingle();

    if (!defaultLink || !defaultLink.is_active) return null;
    return { link: defaultLink as PartnerLinkRow, partner: partner as PartnerRow };
  }

  const { data: partner } = await supabase
    .from("partners")
    .select("*")
    .eq("id", link.partner_id)
    .eq("status", "active")
    .maybeSingle();

  if (!partner) return null;
  return { link: link as PartnerLinkRow, partner: partner as PartnerRow };
}

export async function listPartners(supabase: SupabaseClient): Promise<PartnerRow[]> {
  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new PartnerDomainError("partner_list_failed", 500);
  return (data ?? []) as PartnerRow[];
}

export async function getPartnerById(
  supabase: SupabaseClient,
  partnerId: string
): Promise<PartnerRow | null> {
  const { data } = await supabase.from("partners").select("*").eq("id", partnerId).maybeSingle();
  return (data as PartnerRow) ?? null;
}

export async function getPartnerSummary(
  supabase: SupabaseClient,
  partnerId: string
): Promise<{
  clicks: number;
  registrations: number;
  approved_commissions: number;
  total_approved_cents: number;
  paid_cents: number;
}> {
  const [clicksRes, attrRes, commissionsRes] = await Promise.all([
    supabase
      .from("partner_clicks")
      .select("id", { count: "exact", head: true })
      .eq("partner_id", partnerId),
    supabase
      .from("partner_attributions")
      .select("id", { count: "exact", head: true })
      .eq("partner_id", partnerId),
    supabase
      .from("partner_commissions")
      .select("amount_cents, status")
      .eq("partner_id", partnerId),
  ]);

  const commissions = (commissionsRes.data ?? []) as Pick<
    PartnerCommissionRow,
    "amount_cents" | "status"
  >[];

  let approvedCount = 0;
  let approvedCents = 0;
  let paidCents = 0;
  for (const c of commissions) {
    if (c.status === "approved" || c.status === "paid") {
      approvedCount += 1;
      approvedCents += c.amount_cents;
    }
    if (c.status === "paid") paidCents += c.amount_cents;
  }

  return {
    clicks: clicksRes.count ?? 0,
    registrations: attrRes.count ?? 0,
    approved_commissions: approvedCount,
    total_approved_cents: approvedCents,
    paid_cents: paidCents,
  };
}
