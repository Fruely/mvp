import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

function hashVisitor(seed: string): string {
  return createHash("sha256").update(seed).digest("hex").slice(0, 32);
}

function referrerHost(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).host.slice(0, 200) || null;
  } catch {
    return null;
  }
}

/**
 * Best-effort click insert. Never throws to caller for DB failures.
 */
export async function recordPartnerClick(
  supabase: SupabaseClient,
  input: {
    partnerId: string;
    partnerLinkId: string;
    visitorSeed?: string | null;
    sessionId?: string | null;
    landingPath?: string | null;
    referrer?: string | null;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
  }
): Promise<void> {
  try {
    const { error } = await supabase.from("partner_clicks").insert({
      partner_id: input.partnerId,
      partner_link_id: input.partnerLinkId,
      visitor_id_hash: input.visitorSeed ? hashVisitor(input.visitorSeed) : null,
      session_id: input.sessionId?.slice(0, 128) || null,
      landing_path: input.landingPath?.slice(0, 500) || null,
      referrer_host: referrerHost(input.referrer ?? null),
      utm_source: input.utmSource?.slice(0, 200) || null,
      utm_medium: input.utmMedium?.slice(0, 200) || null,
      utm_campaign: input.utmCampaign?.slice(0, 200) || null,
    });
    if (error) {
      console.error("[partners/clicks] insert failed", error.message);
    }
  } catch (err) {
    console.error("[partners/clicks] unexpected", err);
  }
}
