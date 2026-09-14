import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminToken } from "@/lib/adminApiAuth";

const EVENT_LABELS: Record<string, string> = {
  registered: "Зарегистрировался",
  dashboard_opened: "Открыл кабинет",
  profile_started: "Начал заполнять профиль",
  checkout_started: "Начал оплату",
  paid: "Оплатил",
  published: "Опубликовался",
};

function parseDays(request: NextRequest): number | null {
  const raw = request.nextUrl.searchParams.get("days")?.trim().toLowerCase();
  if (!raw || raw === "30") return 30;
  if (raw === "all") return null;
  const value = Number(raw);
  return [7, 30, 90].includes(value) ? value : 30;
}

export async function GET(request: NextRequest) {
  const authResponse = requireAdminToken(request);
  if (authResponse) return authResponse;

  const supabase = createSupabaseServerClient();
  const days = parseDays(request);
  const since = days == null ? null : new Date(Date.now() - days * 86_400_000).toISOString();

  let query = supabase
    .from("specialist_funnel_events")
    .select("id,specialist_id,event_type,occurred_at,metadata,created_at")
    .order("occurred_at", { ascending: false })
    .limit(250);

  if (since) query = query.gte("occurred_at", since);

  const { data: events, error } = await query;
  if (error) {
    console.error("[admin/funnel-events] events query failed", error);
    return NextResponse.json({ error: "Failed to load funnel events" }, { status: 500 });
  }

  const specialistIds = Array.from(
    new Set((events ?? []).map((row) => String(row.specialist_id ?? "")).filter(Boolean)),
  );

  const specialistById = new Map<string, { name: string | null; email: string | null }>();
  if (specialistIds.length > 0) {
    const { data: specialists, error: specialistsError } = await supabase
      .from("specialists")
      .select("id,name,email")
      .in("id", specialistIds);

    if (specialistsError) {
      console.error("[admin/funnel-events] specialists query failed", specialistsError);
    } else {
      for (const specialist of specialists ?? []) {
        specialistById.set(String(specialist.id), {
          name: typeof specialist.name === "string" ? specialist.name : null,
          email: typeof specialist.email === "string" ? specialist.email : null,
        });
      }
    }
  }

  const rows = (events ?? []).map((row) => {
    const specialistId = String(row.specialist_id ?? "");
    const specialist = specialistById.get(specialistId);
    const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
    const source = typeof (metadata as Record<string, unknown>).source === "string"
      ? String((metadata as Record<string, unknown>).source)
      : null;

    return {
      id: String(row.id),
      specialistId,
      specialistName: specialist?.name ?? null,
      specialistEmail: specialist?.email ?? null,
      eventType: String(row.event_type ?? ""),
      eventLabel: EVENT_LABELS[String(row.event_type ?? "")] ?? String(row.event_type ?? ""),
      occurredAt: typeof row.occurred_at === "string" ? row.occurred_at : null,
      source,
      historical: source?.startsWith("backfill") ?? false,
      approximate: source === "backfill_approximate_time",
    };
  });

  return NextResponse.json(
    { days, since, count: rows.length, events: rows },
    { headers: { "Cache-Control": "no-store" } },
  );
}
