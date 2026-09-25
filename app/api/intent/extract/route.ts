import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { checkAiRateLimits } from "@/lib/ai/aiRateLimit";
import {
  requestAiJson,
  resolveAiJsonAuth,
  type AiJsonErrorCode,
} from "@/lib/ai/aiJsonClient";
import { resolveBearerAuthUser } from "@/lib/auth/resolveBearerAuthUser";
import { suggestCategories } from "@/lib/categories/suggestCategories";
import { normalizeSearchLangToDbCode } from "@/lib/i18n/normalizeSearchLangToDbCode";
import { getClientIP } from "@/lib/rate-limit/shared";
import {
  extractServiceIntent,
  type ServiceIntentModelCall,
} from "@/lib/serviceIntent/extractService";
import {
  serviceIntentErrorStatus,
  type ServiceIntentErrorCode,
} from "@/lib/serviceIntent/errors";
import {
  isServiceIntentExtractionEnabled,
  serviceIntentExtractionModel,
} from "@/lib/serviceIntent/featureFlag";
import {
  SERVICE_INTENT_MODEL_SCHEMA,
  SERVICE_INTENT_MODEL_SCHEMA_NAME,
} from "@/lib/serviceIntent/modelSchema";
import { parseServiceIntentModelPayload } from "@/lib/serviceIntent/modelResponse";
import { validateServiceIntentExtractRequest } from "@/lib/serviceIntent/requestValidation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * `POST /api/intent/extract` — shadow-mode intent extraction.
 *
 * Reads nothing from and writes nothing to `service_requests`, sends no
 * notifications and publishes nothing. The mobile app does not call it yet.
 */

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

const RATE_LIMIT_PER_IP = { limit: 20, windowSeconds: 3600 };
const RATE_LIMIT_PER_USER = { limit: 60, windowSeconds: 3600 };

/** Only the best-ranked compatibility category is considered. */
const CATEGORY_LOOKUP_LIMIT = 1;

function fail(code: ServiceIntentErrorCode, extra?: Record<string, string>) {
  return NextResponse.json(
    { error: code },
    { status: serviceIntentErrorStatus(code), headers: { ...NO_STORE, ...(extra ?? {}) } },
  );
}

function modelErrorCode(code: AiJsonErrorCode): ServiceIntentModelCall {
  if (code === "TIMEOUT") return { ok: false, code: "ai_timeout" };
  if (code === "INVALID_JSON" || code === "SCHEMA_MISMATCH") {
    return { ok: false, code: "invalid_model_response" };
  }
  return { ok: false, code: "ai_unavailable" };
}

export async function POST(request: NextRequest) {
  const correlationId = randomUUID();

  try {
    if (!isServiceIntentExtractionEnabled()) {
      return fail("feature_disabled");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("invalid_request");
    }

    const validated = validateServiceIntentExtractRequest(body);
    if (!validated.ok) {
      return fail(validated.error.code);
    }

    // A user id is only trusted when it comes from a verified bearer token.
    const auth = await resolveBearerAuthUser(request);
    if (auth.kind === "invalid") {
      return fail("invalid_request");
    }
    const userId = auth.kind === "authenticated" ? auth.userId : null;

    const limits = [
      {
        namespace: "intent-extract:ip",
        identifier: getClientIP(request),
        ...RATE_LIMIT_PER_IP,
      },
      ...(userId
        ? [
            {
              namespace: "intent-extract:user",
              identifier: userId,
              ...RATE_LIMIT_PER_USER,
            },
          ]
        : []),
    ];

    const rateLimit = await checkAiRateLimits({ configs: limits });
    if (rateLimit.outcome === "limited") {
      return fail("rate_limited", { "Retry-After": String(rateLimit.retryAfterSec) });
    }
    if (rateLimit.outcome === "unavailable") {
      // A paid endpoint must not run unmetered in production.
      return fail("rate_limiter_unavailable");
    }

    const authConfig = resolveAiJsonAuth(serviceIntentExtractionModel());
    if (!authConfig) {
      return fail("ai_unavailable");
    }

    const supabase = createSupabaseServerClient();

    const result = await extractServiceIntent(validated.input, {
      now: () => new Date(),
      callModel: async ({ systemPrompt, userPayload }) => {
        const response = await requestAiJson({
          auth: authConfig,
          schemaName: SERVICE_INTENT_MODEL_SCHEMA_NAME,
          schema: SERVICE_INTENT_MODEL_SCHEMA,
          systemPrompt,
          userPayload,
          parse: parseServiceIntentModelPayload,
          correlationId,
        });
        if (!response.ok) return modelErrorCode(response.code);
        return { ok: true, payload: response.data };
      },
      lookupCategory: async (query, locale) => {
        const suggestion = await suggestCategories(supabase, {
          query,
          langCode: normalizeSearchLangToDbCode(locale),
          limit: CATEGORY_LOOKUP_LIMIT,
        });
        if (!suggestion.ok) return null;
        const best = suggestion.data[0];
        if (!best?.id) return null;
        return { id: best.id, text: best.title || best.slug };
      },
    });

    if (!result.ok) {
      return fail(result.code);
    }

    return NextResponse.json(result.extraction, { status: 200, headers: NO_STORE });
  } catch (error) {
    // Technical metadata only: no raw text, no contacts, no model output.
    console.error("[intent/extract] unexpected error", {
      correlationId,
      reason: error instanceof Error ? error.name : "unknown",
    });
    return fail("internal_error");
  }
}
