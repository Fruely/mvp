import { NextRequest, NextResponse } from "next/server";
import { parseAgentCreateServiceRequestInput } from "@/lib/agentApi/serviceRequestInput";
import { recordAgentApiAuditEvent } from "@/lib/agentAuth/audit";
import type { AgentAuditMetadata } from "@/lib/agentAuth/auditMetadata";
import {
  markAgentCredentialUsed,
  resolveAgentCredential,
} from "@/lib/agentAuth/resolve";
import type { DelegatedAgentAuthorization } from "@/lib/agentAuthorization/decision";
import { runDelegatedAuthorization } from "@/lib/agentAuthorization/orchestrate";
import { resolveAgentDelegation } from "@/lib/agentDelegation/resolve";
import { normalizeClientIdempotencyKey } from "@/lib/mutations/clientIdempotency";
import { notify } from "@/lib/notifications/notify";
import {
  checkRateLimit,
  RATE_LIMIT_PUBLIC_MESSAGE,
} from "@/lib/rate-limit/shared";
import {
  IDEMPOTENCY_OWNERSHIP_CONFLICT_MESSAGE,
  buildServiceRequestIdempotencyFingerprint,
  lookupServiceRequestIdempotentReplay,
  notifyIfServiceRequestCreated,
  persistNewServiceRequest,
} from "@/lib/serviceRequests/demandService";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const CREATE_SERVICE_REQUEST_CAPABILITY = "create_service_request";
const AGENT_CREATE_ROUTE = "/api/v1/agent/service-requests";

/**
 * Core names verified_agent.rate_limit_profile = standard_agent, but the repo
 * has no numeric table for that profile. Reuse the shared Upstash limiter,
 * keyed by authenticated agentClientId (never a spoofable body identifier),
 * with the same 10/hour window as human POST /api/service-requests.
 */
const AGENT_CREATE_RATE_LIMIT = {
  namespace: "agent:create_service_request",
  limit: 10,
  windowSeconds: 3600,
} as const;

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

function authorizationHttpResponse(
  decision: Exclude<DelegatedAgentAuthorization, { kind: "authorized" }>,
) {
  if (decision.kind === "unauthorized") {
    return json({ error: "unauthorized" }, 401);
  }
  if (decision.kind === "unsupported") {
    return json({ error: "unsupported" }, 400);
  }
  return json({ error: "forbidden" }, 403);
}

async function recordOperationOutcome(event: {
  agentClientId?: string | null;
  credentialId?: string | null;
  requestId?: string | null;
  outcome: "success" | "validation_error" | "rate_limited" | "error";
  httpStatus: number;
  reason: string;
}) {
  try {
    const metadata: AgentAuditMetadata = { reason: event.reason };
    await recordAgentApiAuditEvent({
      agentClientId: event.agentClientId ?? null,
      credentialId: event.credentialId ?? null,
      requestId: event.requestId ?? null,
      capability: CREATE_SERVICE_REQUEST_CAPABILITY,
      route: AGENT_CREATE_ROUTE,
      method: "POST",
      outcome: event.outcome,
      httpStatus: event.httpStatus,
      metadata,
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "unknown";
    console.error("[agent/service-requests] outcome audit failed", { name });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authorization = await runDelegatedAuthorization({
      request,
      capabilityId: CREATE_SERVICE_REQUEST_CAPABILITY,
      deps: {
        resolveCredential: resolveAgentCredential,
        resolveDelegation: resolveAgentDelegation,
        markCredentialUsed: markAgentCredentialUsed,
        recordAudit: recordAgentApiAuditEvent,
      },
    });

    if (authorization.kind !== "authorized") {
      return authorizationHttpResponse(authorization);
    }

    const clientUserId = authorization.delegation.userId;
    const agentClientId = authorization.identity.clientId;
    const credentialId = authorization.identity.credentialId;

    const idempotencyHeader = request.headers.get("idempotency-key");
    if (idempotencyHeader == null || !String(idempotencyHeader).trim()) {
      await recordOperationOutcome({
        agentClientId,
        credentialId,
        outcome: "validation_error",
        httpStatus: 400,
        reason: "missing_idempotency_key",
      });
      return json({ error: "Idempotency-Key is required" }, 400);
    }

    const clientIdempotencyKey = normalizeClientIdempotencyKey(idempotencyHeader);
    if (!clientIdempotencyKey) {
      await recordOperationOutcome({
        agentClientId,
        credentialId,
        outcome: "validation_error",
        httpStatus: 400,
        reason: "invalid_idempotency_key",
      });
      return json({ error: "invalid Idempotency-Key" }, 400);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      await recordOperationOutcome({
        agentClientId,
        credentialId,
        outcome: "validation_error",
        httpStatus: 400,
        reason: "invalid_json",
      });
      return json({ error: "invalid body" }, 400);
    }

    const validated = parseAgentCreateServiceRequestInput(body);
    if ("error" in validated) {
      await recordOperationOutcome({
        agentClientId,
        credentialId,
        outcome: "validation_error",
        httpStatus: validated.status,
        reason: "invalid_input",
      });
      return json({ error: validated.error }, validated.status);
    }

    const supabase = createSupabaseServerClient();
    const idempotencyFingerprint =
      buildServiceRequestIdempotencyFingerprint(validated);
    const replay = await lookupServiceRequestIdempotentReplay(
      supabase,
      clientIdempotencyKey,
      idempotencyFingerprint,
      clientUserId,
    );

    if (replay.kind === "error") {
      await recordOperationOutcome({
        agentClientId,
        credentialId,
        outcome: "error",
        httpStatus: 500,
        reason: "lookup_failed",
      });
      return json({ error: "server_error" }, 500);
    }
    if (replay.kind === "conflict") {
      await recordOperationOutcome({
        agentClientId,
        credentialId,
        outcome: "error",
        httpStatus: 409,
        reason: "idempotency_conflict",
      });
      return json(
        { error: "Idempotency key reused with different payload" },
        409,
      );
    }
    if (replay.kind === "ownership_conflict") {
      await recordOperationOutcome({
        agentClientId,
        credentialId,
        outcome: "error",
        httpStatus: 409,
        reason: "ownership_conflict",
      });
      return json({ error: IDEMPOTENCY_OWNERSHIP_CONFLICT_MESSAGE }, 409);
    }
    if (replay.kind === "replay") {
      const response = replay.response as {
        public_id: string;
        created_at: string;
      };
      await recordOperationOutcome({
        agentClientId,
        credentialId,
        requestId: response.public_id,
        outcome: "success",
        httpStatus: 200,
        reason: "replayed",
      });
      return json(
        {
          ok: true,
          request_id: response.public_id,
          created_at: response.created_at,
        },
        200,
      );
    }

    const rate = await checkRateLimit(request, {
      namespace: AGENT_CREATE_RATE_LIMIT.namespace,
      identifier: agentClientId,
      limit: AGENT_CREATE_RATE_LIMIT.limit,
      windowSeconds: AGENT_CREATE_RATE_LIMIT.windowSeconds,
    });
    if (!rate.allowed) {
      await recordOperationOutcome({
        agentClientId,
        credentialId,
        outcome: "rate_limited",
        httpStatus: 429,
        reason: "rate_limited",
      });
      return NextResponse.json(
        { error: RATE_LIMIT_PUBLIC_MESSAGE },
        {
          status: 429,
          headers: {
            ...NO_STORE,
            "Retry-After": String(rate.retryAfterSec ?? 60),
          },
        },
      );
    }

    const result = await persistNewServiceRequest({
      supabase,
      validated,
      clientUserId,
      idempotencyKey: clientIdempotencyKey,
    });

    if (result.kind === "conflict") {
      await recordOperationOutcome({
        agentClientId,
        credentialId,
        outcome: "error",
        httpStatus: 409,
        reason: "idempotency_conflict",
      });
      return json(
        { error: "Idempotency key reused with different payload" },
        409,
      );
    }
    if (result.kind === "ownership_conflict") {
      await recordOperationOutcome({
        agentClientId,
        credentialId,
        outcome: "error",
        httpStatus: 409,
        reason: "ownership_conflict",
      });
      return json({ error: IDEMPOTENCY_OWNERSHIP_CONFLICT_MESSAGE }, 409);
    }
    if (result.kind === "error") {
      await recordOperationOutcome({
        agentClientId,
        credentialId,
        outcome: "error",
        httpStatus: 500,
        reason: "persist_failed",
      });
      return json({ error: "server_error" }, 500);
    }

    try {
      await notifyIfServiceRequestCreated(result, validated, notify);
    } catch (notifyErr) {
      console.error("[agent/service-requests] owner notification failed", notifyErr);
    }

    await recordOperationOutcome({
      agentClientId,
      credentialId,
      requestId: result.public_id,
      outcome: "success",
      httpStatus: 200,
      reason: result.kind === "replayed" ? "replayed" : "created",
    });

    return json(
      {
        ok: true,
        request_id: result.public_id,
        created_at: result.created_at,
      },
      200,
    );
  } catch (err) {
    console.error("[agent/service-requests] unexpected error", err);
    try {
      await notify("SYSTEM_ERROR", {
        route: AGENT_CREATE_ROUTE,
        error: err,
      });
    } catch {
      // ignore secondary notify failure
    }
    return json({ error: "server_error" }, 500);
  }
}
