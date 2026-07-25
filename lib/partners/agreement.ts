import type { SupabaseClient } from "@supabase/supabase-js";
import { writePartnerAudit } from "@/lib/partners/audit";
import { PartnerDomainError } from "@/lib/partners/errors";
import { PARTNER_AGREEMENT_VERSION } from "@/lib/partners/featureFlags";
import type { PartnerRow } from "@/lib/partners/types";

export { PARTNER_AGREEMENT_VERSION };

export async function acceptPartnerAgreement(
  supabase: SupabaseClient,
  input: {
    partnerId: string;
    userId: string;
    agreementVersion?: string;
  }
): Promise<{ partner: PartnerRow; alreadyAccepted: boolean }> {
  const partnerId = input.partnerId.trim();
  const userId = input.userId.trim();
  const version = (input.agreementVersion || PARTNER_AGREEMENT_VERSION).trim();
  if (!partnerId || !userId || !version) {
    throw new PartnerDomainError("invalid_agreement_input");
  }

  const { data: partner, error } = await supabase
    .from("partners")
    .select("*")
    .eq("id", partnerId)
    .maybeSingle();

  if (error || !partner) throw new PartnerDomainError("partner_not_found", 404);
  if (partner.user_id !== userId) throw new PartnerDomainError("partner_access_denied", 403);

  if (partner.contract_signed_at) {
    return { partner: partner as PartnerRow, alreadyAccepted: true };
  }

  const ts = new Date().toISOString();
  const patch: Record<string, unknown> = {
    contract_signed_at: ts,
    agreement_version: version,
    updated_at: ts,
  };

  // After agreement: allow referral. pending → active so dashboard + link work.
  if (partner.status === "pending") {
    patch.status = "active";
    patch.approved_at = ts;
    patch.disabled_at = null;
  }

  let { data: updated, error: updErr } = await supabase
    .from("partners")
    .update(patch)
    .eq("id", partnerId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  // Graceful fallback if agreement_version column not applied yet.
  if (updErr && /agreement_version/i.test(updErr.message || "")) {
    const fallback = { ...patch };
    delete fallback.agreement_version;
    const retry = await supabase
      .from("partners")
      .update(fallback)
      .eq("id", partnerId)
      .eq("user_id", userId)
      .select("*")
      .maybeSingle();
    updated = retry.data;
    updErr = retry.error;
  }

  if (updErr || !updated) {
    console.error("[partners/agreement] accept failed", updErr?.message);
    throw new PartnerDomainError("agreement_accept_failed", 500);
  }

  if (updated.status === "active") {
    await supabase
      .from("partner_links")
      .update({ is_active: true, updated_at: ts })
      .eq("partner_id", partnerId)
      .eq("code", updated.referral_code);
  }

  await writePartnerAudit(supabase, {
    actorLabel: `user:${userId}`,
    action: "partner_agreement_accepted",
    entityType: "partner",
    entityId: partnerId,
    partnerId,
    payload: {
      agreement_version: version,
      accepted_at: ts,
      status_after: updated.status,
    },
  });

  return { partner: updated as PartnerRow, alreadyAccepted: false };
}
