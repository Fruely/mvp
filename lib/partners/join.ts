import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { writePartnerAudit } from "@/lib/partners/audit";
import { isValidReferralCode, normalizeReferralCode } from "@/lib/partners/codes";
import { PartnerDomainError } from "@/lib/partners/errors";
import { createPartner } from "@/lib/partners/service";
import type { PartnerRow } from "@/lib/partners/types";
import { getPartnerForUser } from "@/lib/partners/session";

function suggestCodeFromEmail(email: string): string {
  const local = email.split("@")[0] || "partner";
  const base = normalizeReferralCode(local).slice(0, 24) || "partner";
  const suffix = randomBytes(2).toString("hex");
  const candidate = `${base}-${suffix}`;
  return isValidReferralCode(candidate) ? candidate : `p-${randomBytes(4).toString("hex")}`;
}

/**
 * Public self-serve join: create partner row + referral code for an authenticated user.
 * No admin approval. Idempotent if partner already bound to user.
 */
export async function ensureSelfServePartner(
  supabase: SupabaseClient,
  input: {
    userId: string;
    email: string;
    name?: string | null;
  }
): Promise<{ partner: PartnerRow; created: boolean }> {
  const userId = input.userId.trim();
  const email = input.email.trim().toLowerCase();
  if (!userId || !email.includes("@")) {
    throw new PartnerDomainError("invalid_join_input");
  }

  const existing = await getPartnerForUser(userId, supabase);
  if (existing) {
    return { partner: existing, created: false };
  }

  // Email may already exist as unbound invite partner — bind if free.
  const { data: byEmail } = await supabase
    .from("partners")
    .select("*")
    .eq("email", email)
    .is("user_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (byEmail) {
    const ts = new Date().toISOString();
    const { data: bound, error } = await supabase
      .from("partners")
      .update({ user_id: userId, updated_at: ts })
      .eq("id", byEmail.id)
      .is("user_id", null)
      .select("*")
      .maybeSingle();
    if (error || !bound) {
      throw new PartnerDomainError("partner_bind_failed", 500);
    }
    await writePartnerAudit(supabase, {
      actorLabel: `user:${userId}`,
      action: "partner_self_serve_bound_existing",
      entityType: "partner",
      entityId: bound.id,
      partnerId: bound.id,
      payload: { email },
    });
    return { partner: bound as PartnerRow, created: false };
  }

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = suggestCodeFromEmail(email);
    try {
      const { partner } = await createPartner(supabase, {
        name: (input.name || email.split("@")[0] || "Partner").trim().slice(0, 120),
        email,
        referralCode: code,
        status: "pending",
      });

      const ts = new Date().toISOString();
      const { data: withUser, error: bindErr } = await supabase
        .from("partners")
        .update({ user_id: userId, updated_at: ts })
        .eq("id", partner.id)
        .select("*")
        .maybeSingle();

      if (bindErr || !withUser) {
        throw new PartnerDomainError("partner_bind_failed", 500);
      }

      await writePartnerAudit(supabase, {
        actorLabel: `user:${userId}`,
        action: "partner_self_serve_created",
        entityType: "partner",
        entityId: withUser.id,
        partnerId: withUser.id,
        payload: { referral_code: withUser.referral_code, email },
      });

      return { partner: withUser as PartnerRow, created: true };
    } catch (err) {
      lastError = err;
      if (err instanceof PartnerDomainError && err.code === "referral_code_taken") {
        continue;
      }
      throw err;
    }
  }

  console.error("[partners/join] code generation exhausted", lastError);
  throw new PartnerDomainError("partner_create_failed", 500);
}
