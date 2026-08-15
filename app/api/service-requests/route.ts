import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  checkRateLimit,
  getClientIP,
  RATE_LIMIT_PUBLIC_MESSAGE,
} from "@/lib/rate-limit/shared";
import { notify } from "@/lib/notifications/notify";
import { CLIENT_CAMPAIGN_COOKIE_NAME } from "@/lib/clientCampaignLinks/cookie";
import { findCampaignByIdForAttribution } from "@/lib/clientCampaignLinks/service";
import { SERVICE_REQUEST_SOURCE } from "@/lib/serviceRequests/constants";
import { generateServiceRequestPublicId, isUniqueViolation } from "@/lib/serviceRequests/publicId";
import { buildOwnerTelegramTimingPayload } from "@/lib/serviceRequests/ownerTelegramTiming";
import { validateServiceRequestCreate } from "@/lib/serviceRequests/validation";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = validateServiceRequestCreate(body);
    if ("error" in validated) {
      return NextResponse.json({ error: validated.error }, { status: validated.status, headers: NO_STORE });
    }

    const ip = getClientIP(request);
    const perIp = await checkRateLimit(request, {
      namespace: "service-request:ip",
      identifier: ip,
      limit: 10,
      windowSeconds: 3600,
    });
    if (!perIp.allowed) {
      return NextResponse.json(
        { error: RATE_LIMIT_PUBLIC_MESSAGE },
        {
          status: 429,
          headers: { ...NO_STORE, "Retry-After": String(perIp.retryAfterSec ?? 60) },
        },
      );
    }

    const supabase = createSupabaseServerClient();
    const nowIso = new Date().toISOString();

    let clientCampaignLinkId: string | null = null;
    const campaignCookie = cookies().get(CLIENT_CAMPAIGN_COOKIE_NAME)?.value?.trim();
    if (campaignCookie) {
      try {
        const campaign = await findCampaignByIdForAttribution(supabase, campaignCookie);
        if (campaign) {
          clientCampaignLinkId = campaign.id;
        }
      } catch (campaignErr) {
        console.error("[service-requests/create] campaign attribution lookup failed", campaignErr);
      }
    }

    let inserted: { public_id: string; created_at: string } | null = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const public_id = generateServiceRequestPublicId();
      const row = {
        public_id,
        client_name: validated.client_name,
        client_email: validated.client_email,
        client_phone: validated.client_phone,
        category_id: validated.category_id,
        category_text: validated.category_text,
        description: validated.description,
        preferred_language: validated.preferred_language,
        work_format: validated.work_format,
        city: validated.city,
        postal_code: validated.postal_code,
        country_code: validated.country_code,
        radius_km: validated.radius_km,
        urgency: validated.urgency,
        desired_date: validated.desired_date,
        service_timing_type: validated.service_timing.service_timing_type,
        service_timing_date: validated.service_timing.service_timing_date,
        service_timing_time: validated.service_timing.service_timing_time,
        service_timing_date_end: validated.service_timing.service_timing_date_end,
        service_timing_period: validated.service_timing.service_timing_period,
        service_timing_note: validated.service_timing.service_timing_note,
        locale: validated.locale,
        source: SERVICE_REQUEST_SOURCE,
        source_path: validated.source_path,
        client_campaign_link_id: clientCampaignLinkId,
        status: "new",
        updated_at: nowIso,
      };

      const { data, error } = await supabase
        .from("service_requests")
        .insert(row)
        .select("public_id, created_at")
        .single();

      if (!error && data) {
        inserted = data as { public_id: string; created_at: string };
        break;
      }

      if (!isUniqueViolation(error)) {
        console.error("[service-requests/create] insert failed", error);
        return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
      }
    }

    if (!inserted) {
      console.error("[service-requests/create] public_id collision retries exhausted");
      return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
    }

    try {
      const timingPayload = buildOwnerTelegramTimingPayload(validated);
      await notify("NEW_SERVICE_REQUEST", {
        public_id: inserted.public_id,
        category_text: validated.category_text,
        preferred_language: validated.preferred_language,
        work_format: validated.work_format,
        city: validated.city,
        postal_code: validated.postal_code,
        when_label: timingPayload.when_label,
        urgency: timingPayload.urgency,
        created_at: inserted.created_at,
        locale: validated.locale,
      });
    } catch (notifyErr) {
      console.error("[service-requests/create] owner notification failed", notifyErr);
    }

    const response = NextResponse.json(
      {
        ok: true,
        public_id: inserted.public_id,
        created_at: inserted.created_at,
      },
      { status: 200, headers: NO_STORE },
    );
    if (clientCampaignLinkId) {
      response.cookies.set(CLIENT_CAMPAIGN_COOKIE_NAME, "", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 0,
      });
    }
    return response;
  } catch (err) {
    console.error("[service-requests/create] unexpected error", err);
    try {
      await notify("SYSTEM_ERROR", { route: "/api/service-requests", error: err });
    } catch {
      // ignore secondary notify failure
    }
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
