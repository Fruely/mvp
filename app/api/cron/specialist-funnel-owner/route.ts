import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/api/response";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isFunnelOwnerNotificationEvent,
  sendSpecialistFunnelOwnerMessage,
} from "@/lib/notifications/specialistFunnelOwner";

export const dynamic = "force-dynamic";

const LOOKBACK_MS = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 50;

type FunnelEventRow = {
  id: string;
  specialist_id: string;
  event_type: string;
  occurred_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();
  const since = new Date(Date.now() - LOOKBACK_MS).toISOString();

  const { data, error } = await supabase
    .from("specialist_funnel_events")
    .select("id, specialist_id, event_type, occurred_at, metadata, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error("[cron/specialist-funnel-owner] query failed", error);
    return jsonNoStore({ error: "Query failed" }, { status: 500 });
  }

  const rows = (data ?? []) as FunnelEventRow[];
  let checked = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    checked += 1;
    const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
    const source = typeof metadata.source === "string" ? metadata.source : "";
    const alreadyNotified =
      typeof metadata.owner_notified_at === "string" && metadata.owner_notified_at.length > 0;

    if (
      alreadyNotified ||
      source.startsWith("backfill") ||
      !isFunnelOwnerNotificationEvent(row.event_type)
    ) {
      skipped += 1;
      continue;
    }

    try {
      const { data: specialist } = await supabase
        .from("specialists")
        .select("name")
        .eq("id", row.specialist_id)
        .maybeSingle();

      await sendSpecialistFunnelOwnerMessage({
        eventType: row.event_type,
        specialistId: row.specialist_id,
        specialistName:
          typeof specialist?.name === "string" ? specialist.name : null,
        occurredAt: row.occurred_at,
      });

      const notifiedAt = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("specialist_funnel_events")
        .update({
          metadata: {
            ...metadata,
            owner_notified_at: notifiedAt,
          },
        })
        .eq("id", row.id);

      if (updateError) {
        failed += 1;
        console.error("[cron/specialist-funnel-owner] mark notified failed", {
          eventId: row.id,
          error: updateError,
        });
      } else {
        sent += 1;
      }
    } catch (notifyError) {
      failed += 1;
      console.error("[cron/specialist-funnel-owner] send failed", {
        eventId: row.id,
        eventType: row.event_type,
        error: notifyError,
      });
    }
  }

  return jsonNoStore({ checked, sent, skipped, failed });
}
