import type { SupabaseClient } from "@supabase/supabase-js";

export async function writePartnerAudit(
  supabase: SupabaseClient,
  input: {
    actorLabel: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    partnerId?: string | null;
    payload?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await supabase.from("partner_audit_log").insert({
    actor_label: input.actorLabel,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    partner_id: input.partnerId ?? null,
    payload: input.payload ?? {},
  });
  if (error) {
    console.error("[partners/audit] insert failed", error.message);
  }
}
