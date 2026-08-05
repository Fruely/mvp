import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { writePartnerAudit } from "@/lib/partners/audit";
import { isValidReferralCode, normalizeReferralCode } from "@/lib/partners/codes";
import { PartnerDomainError } from "@/lib/partners/errors";
import { defaultBecomeSpecialistPath } from "@/lib/partners/targetPath";
import type { PartnerRow, PartnerStatus } from "@/lib/partners/types";

function suggestCodeFromEmail(email: string): string {
  const local = email.split("@")[0] || "partner";
  const base = normalizeReferralCode(local).slice(0, 24) || "partner";
  const suffix = randomBytes(2).toString("hex");
  const candidate = `${base}-${suffix}`;
  return isValidReferralCode(candidate) ? candidate : `p-${randomBytes(4).toString("hex")}`;
}

function canAssignNewReferralCode(status: PartnerStatus): boolean {
  return status === "active" || status === "pending";
}

async function ensurePrimaryLink(
  supabase: SupabaseClient,
  partner: PartnerRow,
  code: string,
  activate: boolean
): Promise<void> {
  const ts = new Date().toISOString();
  const { data: existingLink } = await supabase
    .from("partner_links")
    .select("id, is_active")
    .eq("partner_id", partner.id)
    .eq("code", code)
    .maybeSingle();

  if (existingLink) {
    if (activate && !existingLink.is_active) {
      await supabase
        .from("partner_links")
        .update({ is_active: true, updated_at: ts })
        .eq("id", existingLink.id);
    }
    return;
  }

  const { error } = await supabase.from("partner_links").insert({
    partner_id: partner.id,
    code,
    campaign: "default",
    target_path: defaultBecomeSpecialistPath("ua"),
    is_active: activate,
    created_at: ts,
    updated_at: ts,
  });

  if (error?.code === "23505") {
    throw new PartnerDomainError("referral_code_taken", 409);
  }
  if (error) {
    throw new PartnerDomainError("partner_link_create_failed", 500);
  }
}

/**
 * Idempotently ensures an active/pending partner has a valid primary referral code + link.
 * Does not mint new active links for paused/disabled/rejected partners.
 */
export async function ensurePartnerPrimaryReferralCode(
  supabase: SupabaseClient,
  partner: PartnerRow,
  input?: { email?: string | null }
): Promise<PartnerRow> {
  const email = (input?.email || partner.email || "").trim().toLowerCase();
  const existingCode = partner.referral_code?.trim() ?? "";
  const activateLink = partner.status === "active";

  if (existingCode && isValidReferralCode(existingCode)) {
    if (canAssignNewReferralCode(partner.status)) {
      await ensurePrimaryLink(supabase, partner, existingCode, activateLink);
    }
    return partner;
  }

  if (!canAssignNewReferralCode(partner.status)) {
    return partner;
  }

  if (!email.includes("@")) {
    throw new PartnerDomainError("invalid_join_input");
  }

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = suggestCodeFromEmail(email);
    const ts = new Date().toISOString();
    try {
      const { data: updated, error } = await supabase
        .from("partners")
        .update({ referral_code: code, updated_at: ts })
        .eq("id", partner.id)
        .select("*")
        .maybeSingle();

      if (error?.code === "23505") {
        lastError = error;
        continue;
      }
      if (error || !updated) {
        throw new PartnerDomainError("partner_update_failed", 500);
      }

      await ensurePrimaryLink(supabase, updated as PartnerRow, code, activateLink);
      await writePartnerAudit(supabase, {
        actorLabel: `partner:${partner.id}`,
        action: "partner_referral_code_recovered",
        entityType: "partner",
        entityId: partner.id,
        partnerId: partner.id,
        payload: { referral_code: code },
      });

      return updated as PartnerRow;
    } catch (err) {
      lastError = err;
      if (err instanceof PartnerDomainError && err.code === "referral_code_taken") {
        continue;
      }
      throw err;
    }
  }

  console.error("[partners/ensureReferralCode] exhausted retries", lastError);
  throw new PartnerDomainError("partner_create_failed", 500);
}
