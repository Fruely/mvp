import type { SupabaseClient } from "@supabase/supabase-js";
import { writePartnerAudit } from "@/lib/partners/audit";
import { PartnerDomainError } from "@/lib/partners/errors";
import {
  evaluateInvitationConsume,
  generateInviteToken,
  hashToken,
} from "@/lib/partners/invitationLogic";

export {
  evaluateInvitationConsume,
  generateInviteToken,
  hashToken,
} from "@/lib/partners/invitationLogic";

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const GENERIC_INVALID = "invite_invalid";

export async function createInvitation(
  supabase: SupabaseClient,
  input: {
    partnerId: string;
    email?: string | null;
    ttlMs?: number;
    createdByLabel?: string;
  }
): Promise<{ invitationId: string; rawToken: string; expiresAt: string; email: string }> {
  const partnerId = input.partnerId.trim();
  if (!partnerId) throw new PartnerDomainError("partner_id_required");

  const { data: partner, error } = await supabase
    .from("partners")
    .select("id, email, user_id, status")
    .eq("id", partnerId)
    .maybeSingle();

  if (error || !partner) throw new PartnerDomainError("partner_not_found", 404);
  if (partner.user_id) throw new PartnerDomainError("partner_already_bound", 409);

  const email = (input.email?.trim() || partner.email).toLowerCase();
  if (!email.includes("@")) throw new PartnerDomainError("invalid_email");

  const rawToken = generateInviteToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + (input.ttlMs ?? DEFAULT_TTL_MS)).toISOString();
  const createdByLabel = input.createdByLabel?.trim() || "admin_token";

  const { data: row, error: insertErr } = await supabase
    .from("partner_invitations")
    .insert({
      partner_id: partnerId,
      email,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by_label: createdByLabel,
    })
    .select("id")
    .single();

  if (insertErr || !row) {
    console.error("[partners/invitations] create failed", insertErr?.message);
    throw new PartnerDomainError("invite_create_failed", 500);
  }

  await writePartnerAudit(supabase, {
    actorLabel: createdByLabel,
    action: "partner_invitation_created",
    entityType: "partner_invitation",
    entityId: row.id,
    partnerId,
    payload: { email, expires_at: expiresAt },
  });

  return {
    invitationId: row.id as string,
    rawToken,
    expiresAt,
    email,
  };
}

/**
 * Bind partners.user_id from a one-time invite token.
 * Failures use a single generic code to avoid enumeration.
 */
export async function consumeInvitation(
  supabase: SupabaseClient,
  input: {
    token: string;
    userId: string;
    userEmail: string | null | undefined;
  }
): Promise<{ partnerId: string; alreadyBound: boolean }> {
  const raw = input.token.trim();
  const userId = input.userId.trim();
  if (!raw || !userId) throw new PartnerDomainError(GENERIC_INVALID, 400);

  const tokenHash = hashToken(raw);
  const { data: invitation } = await supabase
    .from("partner_invitations")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  const { data: partner } = invitation
    ? await supabase.from("partners").select("*").eq("id", invitation.partner_id).maybeSingle()
    : { data: null };

  if (partner?.user_id === userId) {
    if (invitation && !invitation.used_at) {
      await supabase
        .from("partner_invitations")
        .update({ used_at: new Date().toISOString() })
        .eq("id", invitation.id);
    }
    return { partnerId: partner.id as string, alreadyBound: true };
  }

  const evaluation = evaluateInvitationConsume({
    invitation: invitation
      ? {
          used_at: invitation.used_at,
          expires_at: invitation.expires_at,
          email: invitation.email,
        }
      : null,
    partner: partner ? { user_id: partner.user_id } : null,
    userId,
    userEmail: input.userEmail,
  });

  if (!evaluation.ok || !invitation || !partner) {
    throw new PartnerDomainError(GENERIC_INVALID, 400);
  }

  const { data: existing } = await supabase
    .from("partners")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing && existing.id !== partner.id) {
    throw new PartnerDomainError(GENERIC_INVALID, 400);
  }

  const ts = new Date().toISOString();
  const { error: bindErr } = await supabase
    .from("partners")
    .update({ user_id: userId, updated_at: ts })
    .eq("id", partner.id)
    .is("user_id", null);

  if (bindErr) {
    console.error("[partners/invitations] bind failed", bindErr.message);
    throw new PartnerDomainError(GENERIC_INVALID, 400);
  }

  const { error: useErr } = await supabase
    .from("partner_invitations")
    .update({ used_at: ts })
    .eq("id", invitation.id)
    .is("used_at", null);

  if (useErr) {
    console.error("[partners/invitations] mark used failed", useErr.message);
  }

  await writePartnerAudit(supabase, {
    actorLabel: `user:${userId}`,
    action: "partner_user_bound",
    entityType: "partner",
    entityId: partner.id,
    partnerId: partner.id,
    payload: { invitation_id: invitation.id },
  });

  return { partnerId: partner.id as string, alreadyBound: false };
}
