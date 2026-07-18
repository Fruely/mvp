import type { SupabaseClient } from "@supabase/supabase-js";
import { writePartnerAudit } from "@/lib/partners/audit";
import { decodeReferralCookie } from "@/lib/partners/cookie";
import type { AttributionMethod, PartnerAttributionRow } from "@/lib/partners/types";

export type AttributionResult =
  | { ok: true; attribution: PartnerAttributionRow; created: boolean }
  | { ok: false; reason: string };

/**
 * Hard-bind first-touch partner attribution for a newly created user/specialist.
 * Never overwrites existing attribution. Failures are returned, not thrown.
 *
 * Rule: disabled/paused partners still honor an already-issued valid cookie
 * for attribution (cookie was granted while active). New clicks require active.
 */
export async function tryCreateAttributionFromCookie(
  supabase: SupabaseClient,
  input: {
    userId: string;
    specialistId: string;
    cookieRaw: string | undefined | null;
  }
): Promise<AttributionResult> {
  try {
    const payload = decodeReferralCookie(input.cookieRaw ?? undefined);
    if (!payload) {
      return { ok: false, reason: "no_valid_cookie" };
    }

    // Self-referral when partner.user_id is known
    const { data: partner } = await supabase
      .from("partners")
      .select("id, user_id, status")
      .eq("id", payload.partnerId)
      .maybeSingle();

    if (!partner) {
      return { ok: false, reason: "partner_not_found" };
    }

    if (partner.user_id && partner.user_id === input.userId) {
      await writePartnerAudit(supabase, {
        actorLabel: "system",
        action: "self_referral_blocked",
        entityType: "partner_attribution",
        partnerId: partner.id,
        payload: { user_id: input.userId },
      });
      return { ok: false, reason: "self_referral" };
    }

    // Reject only if partner was never eligible (rejected). Disabled/paused/active/pending
    // with a previously issued cookie: allow bind so legal first-touch is preserved.
    if (partner.status === "rejected") {
      return { ok: false, reason: "partner_rejected" };
    }

    const { data: link } = await supabase
      .from("partner_links")
      .select("id, partner_id")
      .eq("id", payload.linkId)
      .eq("partner_id", payload.partnerId)
      .maybeSingle();

    if (!link) {
      return { ok: false, reason: "link_not_found" };
    }

    const { data: existingUser } = await supabase
      .from("partner_attributions")
      .select("id")
      .eq("user_id", input.userId)
      .maybeSingle();
    if (existingUser) {
      return { ok: false, reason: "already_attributed_user" };
    }

    const { data: existingSpec } = await supabase
      .from("partner_attributions")
      .select("id")
      .eq("specialist_id", input.specialistId)
      .maybeSingle();
    if (existingSpec) {
      return { ok: false, reason: "already_attributed_specialist" };
    }

    const method: AttributionMethod = "cookie";
    const registeredAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("partner_attributions")
      .insert({
        partner_id: payload.partnerId,
        partner_link_id: payload.linkId,
        user_id: input.userId,
        specialist_id: input.specialistId,
        attribution_method: method,
        first_click_at: new Date(payload.issuedAt).toISOString(),
        registered_at: registeredAt,
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { ok: false, reason: "duplicate_attribution" };
      }
      console.error("[partners/attribution] insert failed", error.message);
      return { ok: false, reason: "insert_failed" };
    }

    return { ok: true, attribution: data as PartnerAttributionRow, created: true };
  } catch (err) {
    console.error("[partners/attribution] unexpected", err);
    return { ok: false, reason: "unexpected_error" };
  }
}
