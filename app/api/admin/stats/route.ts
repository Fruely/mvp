import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import { ACTIVE_SUBSCRIPTION_PLAN_STATUSES } from "@/lib/specialists/subscription";

const FUNNEL_STAGES = [
  { key: "registered", label: "Зарегистрировались" },
  { key: "dashboard_opened", label: "Открыли кабинет" },
  { key: "profile_started", label: "Начали профиль" },
  { key: "checkout_started", label: "Начали оплату" },
  { key: "paid", label: "Оплатили" },
  { key: "published", label: "Опубликовались" },
] as const;

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

  try {
    const supabase = createSupabaseServerClient();
    const days = parseDays(request);
    const since = days == null ? null : new Date(Date.now() - days * 86_400_000).toISOString();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalLeadsResult,
      recentLeadsResult,
      approvedResult,
      pendingResult,
      subscriptionsResult,
    ] = await Promise.all([
      supabase.from("leads").select("*", { count: "exact", head: true }),
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString()),
      supabase
        .from("specialists")
        .select("*", { count: "exact", head: true })
        .in("status", ["approved", "published_unverified", "featured_verified"]),
      supabase
        .from("specialists")
        .select("*", { count: "exact", head: true })
        .eq("status", "draft"),
      supabase
        .from("specialist_plan")
        .select("*", { count: "exact", head: true })
        .in("plan_status", [...ACTIVE_SUBSCRIPTION_PLAN_STATUSES]),
    ]);

    const baseErrors = [
      totalLeadsResult.error,
      recentLeadsResult.error,
      approvedResult.error,
      pendingResult.error,
      subscriptionsResult.error,
    ].filter(Boolean);
    if (baseErrors.length > 0) throw baseErrors[0];

    let funnelQuery = supabase
      .from("specialist_funnel_events")
      .select("specialist_id,event_type,occurred_at")
      .in(
        "event_type",
        FUNNEL_STAGES.map((stage) => stage.key),
      );

    if (since) funnelQuery = funnelQuery.gte("occurred_at", since);

    const { data: funnelRows, error: funnelError } = await funnelQuery;
    if (funnelError) throw funnelError;

    const uniqueByStage = new Map<string, Set<string>>();
    for (const stage of FUNNEL_STAGES) uniqueByStage.set(stage.key, new Set());

    for (const row of funnelRows ?? []) {
      const type = typeof row.event_type === "string" ? row.event_type : "";
      const specialistId = typeof row.specialist_id === "string" ? row.specialist_id : "";
      if (specialistId && uniqueByStage.has(type)) uniqueByStage.get(type)!.add(specialistId);
    }

    const registeredCount = uniqueByStage.get("registered")?.size ?? 0;
    const funnel = FUNNEL_STAGES.map((stage, index) => {
      const count = uniqueByStage.get(stage.key)?.size ?? 0;
      const previousCount =
        index === 0 ? count : uniqueByStage.get(FUNNEL_STAGES[index - 1].key)?.size ?? 0;
      return {
        key: stage.key,
        label: stage.label,
        count,
        conversionFromStart: registeredCount > 0 ? Math.round((count / registeredCount) * 1000) / 10 : 0,
        conversionFromPrevious:
          index === 0 || previousCount <= 0 ? 100 : Math.round((count / previousCount) * 1000) / 10,
        dropFromPrevious: index === 0 ? 0 : Math.max(previousCount - count, 0),
      };
    });

    return NextResponse.json(
      {
        totalLeads: totalLeadsResult.count || 0,
        recentLeads: recentLeadsResult.count || 0,
        approvedSpecialists: approvedResult.count || 0,
        pendingSpecialists: pendingResult.count || 0,
        activeSubscriptions: subscriptionsResult.count || 0,
        specialistFunnel: {
          days,
          since,
          stages: funnel,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
