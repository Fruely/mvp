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
import {
  ACQUISITION_COOKIE_NAME,
  parseAcquisitionCookie,
  parseAcquisitionSnapshot,
  pickAcquisitionForServiceRequest,
} from "@/lib/acquisition/firstTouch";
import { validateServiceRequestCreate } from "@/lib/serviceRequests/validation";
import { normalizeClientIdempotencyKey } from "@/lib/mutations/clientIdempotency";
import { resolveBearerAuthUser } from "@/lib/auth/resolveBearerAuthUser";
import { matchAfterServiceRequestCreated } from "@/lib/matching/matchAfterCreate";
import {
  IDEMPOTENCY_OWNERSHIP_CONFLICT_MESSAGE,
  buildServiceRequestIdempotencyFingerprint,
  lookupServiceRequestIdempotentReplay,
  notifyIfServiceRequestCreated,
  persistNewServiceRequest,
} from "@/lib/serviceRequests/demandService";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function jsonResult(
  result: { kind: "replayed" | "created"; public_id: string; created_at: string },
) {
  return NextResponse.json(
    { ok: true, public_id: result.public_id, created_at: result.created_at },
    { status: 200, headers: NO_STORE },
  );
}

function mapCreateFailure(result: { kind: "conflict" | "ownership_conflict" | "error" }) {
  if (result.kind === "conflict") {
    return NextResponse.json(
      { error: "Idempotency key reused with different payload" },
      { status: 409, headers: NO_STORE },
    );
  }
  if (result.kind === "ownership_conflict") {
    return NextResponse.json(
      { error: IDEMPOTENCY_OWNERSHIP_CONFLICT_MESSAGE },
      { status: 409, headers: NO_STORE },
    );
  }
  return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveBearerAuthUser(request);
    if (auth.kind === "invalid") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
    }

    const clientUserId = auth.kind === "authenticated" ? auth.userId : null;
    const body = await request.json();
    const validated = validateServiceRequestCreate(body);
    if ("error" in validated) {
      return NextResponse.json({ error: validated.error }, { status: validated.status, headers: NO_STORE });
    }

    const supabase = createSupabaseServerClient();
    const clientIdempotencyKey = normalizeClientIdempotencyKey(body.idempotency_key);
    const idempotencyFingerprint = buildServiceRequestIdempotencyFingerprint(validated);

    if (clientIdempotencyKey) {
      const replay = await lookupServiceRequestIdempotentReplay(
        supabase,
        clientIdempotencyKey,
        idempotencyFingerprint,
        clientUserId,
      );
      if (replay.kind === "error") {
        return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
      }
      if (replay.kind === "conflict") {
        return mapCreateFailure({ kind: "conflict" });
      }
      if (replay.kind === "ownership_conflict") {
        return mapCreateFailure({ kind: "ownership_conflict" });
      }
      if (replay.kind === "replay") {
        return NextResponse.json(replay.response, { status: 200, headers: NO_STORE });
      }
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

    let clientCampaignLinkId: string | null = null;
    const campaignCookie = cookies().get(CLIENT_CAMPAIGN_COOKIE_NAME)?.value?.trim();
    if (campaignCookie) {
      try {
        const campaign = await findCampaignByIdForAttribution(supabase, campaignCookie);
        if (campaign) clientCampaignLinkId = campaign.id;
      } catch (campaignErr) {
        console.error("[service-requests/create] campaign attribution lookup failed", campaignErr);
      }
    }

    const cookieAcquisition = parseAcquisitionCookie(cookies().get(ACQUISITION_COOKIE_NAME)?.value);
    const bodyAcquisition = parseAcquisitionSnapshot(
      body && typeof body === "object" ? (body as { acquisition?: unknown }).acquisition : null,
    );
    const acquisition = pickAcquisitionForServiceRequest(bodyAcquisition, cookieAcquisition);

    const result = await persistNewServiceRequest({
      supabase,
      validated,
      clientUserId,
      idempotencyKey: clientIdempotencyKey,
      acquisition,
      clientCampaignLinkId,
    });

    if (result.kind === "conflict" || result.kind === "ownership_conflict" || result.kind === "error") {
      return mapCreateFailure(result);
    }

    try {
      await notifyIfServiceRequestCreated(result, validated, notify);
    } catch (notifyErr) {
      console.error("[service-requests/create] owner notification failed", notifyErr);
    }

    if (result.kind === "created") {
      await matchAfterServiceRequestCreated(supabase, result, validated);
    }

    const response = jsonResult(result);
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
