import type { SupabaseClient } from "@supabase/supabase-js";
import { writePartnerAudit } from "@/lib/partners/audit";
import {
  validateApplicationInput,
  type ApplicationInput,
} from "@/lib/partners/applicationValidation";
import { PartnerDomainError } from "@/lib/partners/errors";
import { createPartner } from "@/lib/partners/service";
import { validateReferralCode } from "@/lib/partners/codes";
import type { PartnerRow } from "@/lib/partners/types";

export {
  isValidHttpUrl,
  normalizeExtraLinks,
  validateApplicationInput,
  type ApplicationInput,
} from "@/lib/partners/applicationValidation";

export async function createApplication(
  supabase: SupabaseClient,
  input: ApplicationInput
): Promise<{ id: string }> {
  const validated = validateApplicationInput(input);
  if (!validated.ok) throw new PartnerDomainError(validated.error);

  const v = validated.value;
  const ts = new Date().toISOString();
  const { data, error } = await supabase
    .from("partner_applications")
    .insert({
      name: v.name,
      email: v.email,
      channel_name: v.channel_name,
      channel_url: v.channel_url,
      extra_links: v.extra_links,
      platform: v.platform,
      topic: v.topic,
      audience_lang: v.audience_lang,
      audience_geo: v.audience_geo,
      subscribers_approx: v.subscribers_approx,
      reach_approx: v.reach_approx,
      comment: v.comment,
      privacy_accepted_at: v.privacy_accepted_at,
      status: "pending",
      created_at: ts,
      updated_at: ts,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[partners/applications] insert failed", error?.message);
    throw new PartnerDomainError("application_create_failed", 500);
  }

  return { id: data.id as string };
}

function slugFromChannel(name: string, email: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const fallback = email.split("@")[0]?.replace(/[^a-z0-9-]/g, "") || "partner";
  return base || fallback || "partner";
}

export async function approveApplication(
  supabase: SupabaseClient,
  input: {
    applicationId: string;
    referralCode?: string | null;
    commissionAmountCents?: number;
    status?: "active" | "pending";
  }
): Promise<{ applicationId: string; partner: PartnerRow }> {
  const applicationId = input.applicationId.trim();
  if (!applicationId) throw new PartnerDomainError("application_id_required");

  const { data: app, error } = await supabase
    .from("partner_applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();

  if (error || !app) throw new PartnerDomainError("application_not_found", 404);
  if (app.status === "approved" && app.partner_id) {
    const { data: existing } = await supabase
      .from("partners")
      .select("*")
      .eq("id", app.partner_id)
      .maybeSingle();
    if (existing) {
      return { applicationId, partner: existing as PartnerRow };
    }
  }
  if (app.status === "rejected") throw new PartnerDomainError("application_rejected", 409);

  let codeRaw =
    (typeof input.referralCode === "string" && input.referralCode.trim()) ||
    slugFromChannel(app.channel_name || app.name, app.email);
  let codeResult = validateReferralCode(codeRaw);
  if (!codeResult.ok) {
    codeResult = validateReferralCode(`${codeRaw}-p`);
  }
  if (!codeResult.ok) throw new PartnerDomainError("invalid_referral_code");

  let partner: PartnerRow | null = null;
  let linkCode = codeResult.code;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const tryCode = attempt === 0 ? linkCode : `${linkCode}-${attempt + 1}`;
    const validated = validateReferralCode(tryCode);
    if (!validated.ok) continue;
    try {
      const created = await createPartner(supabase, {
        name: app.name,
        email: app.email,
        referralCode: validated.code,
        channelName: app.channel_name,
        channelUrl: app.channel_url,
        commissionAmountCents: input.commissionAmountCents,
        status: input.status ?? "active",
      });
      partner = created.partner;
      break;
    } catch (e) {
      if (e instanceof PartnerDomainError && e.code === "referral_code_taken") continue;
      throw e;
    }
  }

  if (!partner) throw new PartnerDomainError("referral_code_taken", 409);

  const ts = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("partner_applications")
    .update({
      status: "approved",
      partner_id: partner.id,
      updated_at: ts,
      reject_reason: null,
    })
    .eq("id", applicationId);

  if (updErr) {
    console.error("[partners/applications] approve update failed", updErr.message);
    throw new PartnerDomainError("application_approve_failed", 500);
  }

  await writePartnerAudit(supabase, {
    actorLabel: "admin_token",
    action: "partner_application_approved",
    entityType: "partner_application",
    entityId: applicationId,
    partnerId: partner.id,
    payload: { referral_code: partner.referral_code },
  });

  return { applicationId, partner };
}

export async function rejectApplication(
  supabase: SupabaseClient,
  input: { applicationId: string; rejectReason?: string | null }
): Promise<void> {
  const applicationId = input.applicationId.trim();
  if (!applicationId) throw new PartnerDomainError("application_id_required");

  const { data: app, error } = await supabase
    .from("partner_applications")
    .select("id, status")
    .eq("id", applicationId)
    .maybeSingle();

  if (error || !app) throw new PartnerDomainError("application_not_found", 404);
  if (app.status === "approved") throw new PartnerDomainError("application_already_approved", 409);

  const ts = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("partner_applications")
    .update({
      status: "rejected",
      reject_reason: input.rejectReason?.trim().slice(0, 1000) || null,
      updated_at: ts,
    })
    .eq("id", applicationId);

  if (updErr) throw new PartnerDomainError("application_reject_failed", 500);

  await writePartnerAudit(supabase, {
    actorLabel: "admin_token",
    action: "partner_application_rejected",
    entityType: "partner_application",
    entityId: applicationId,
    payload: { reject_reason: input.rejectReason?.trim().slice(0, 200) || null },
  });
}

export async function listApplications(
  supabase: SupabaseClient,
  status?: "pending" | "approved" | "rejected"
) {
  let query = supabase
    .from("partner_applications")
    .select(
      "id, name, email, channel_name, channel_url, platform, topic, status, reject_reason, partner_id, created_at, updated_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new PartnerDomainError("application_list_failed", 500);
  return data ?? [];
}
