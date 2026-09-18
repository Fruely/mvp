import "server-only";

import { headers } from "next/headers";
import { assertAdminSession } from "@/lib/adminSession";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  PROMOTION_SUMMARY_MAX_LEN,
  PROMOTION_TITLE_MAX_LEN,
  type PromotionLocale,
} from "./promotionConstants";
import { isPromotionLocale } from "./localizedPublicCopy";

const LANGUAGE_NAMES: Record<PromotionLocale, string> = {
  ru: "Russian",
  ua: "Ukrainian",
  de: "German",
};

const DEFAULT_GATEWAY_MODEL = "openai/gpt-5-mini";
const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

const PROMOTION_DRAFT_REQUEST_SELECT = [
  "description",
  "requested_service",
  "subcategory_text",
  "client_budget_text",
  "preferred_language",
  "work_format",
  "city",
  "postal_code",
  "category_text",
  "urgency",
  "desired_date",
  "service_timing_type",
  "service_timing_date",
  "service_timing_time",
  "service_timing_date_end",
  "service_timing_period",
  "service_timing_note",
  "locale",
].join(", ");

type PromotionDraftRequestRow = {
  description: string | null;
  requested_service: string | null;
  subcategory_text: string | null;
  client_budget_text: string | null;
  preferred_language: string | null;
  work_format: string | null;
  city: string | null;
  postal_code: string | null;
  category_text: string | null;
  urgency: string | null;
  desired_date: string | null;
  service_timing_type: string | null;
  service_timing_date: string | null;
  service_timing_time: string | null;
  service_timing_date_end: string | null;
  service_timing_period: string | null;
  service_timing_note: string | null;
  locale: string | null;
};

export type GeneratedPromotionDraft = {
  locale: PromotionLocale;
  title: string;
  summary: string;
};

type ChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

function normalizeLocale(value: string | null | undefined): PromotionLocale | null {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "uk" || normalized === "ua") return "ua";
  return isPromotionLocale(normalized) ? normalized : null;
}

function sourceLocaleForRequest(row: PromotionDraftRequestRow): PromotionLocale {
  return normalizeLocale(row.preferred_language) ?? normalizeLocale(row.locale) ?? "ru";
}

function sanitizeFreeText(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;

  const sanitized = value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[contact removed]")
    .replace(/(?:https?:\/\/|www\.)\S+/gi, "[link removed]")
    .replace(/(^|\s)@[A-Za-z0-9_]{3,}/g, "$1[handle removed]")
    .replace(/\+?\d[\d\s()./-]{6,}\d/g, "[phone removed]")
    .replace(/\s+/g, " ")
    .trim();

  return sanitized || null;
}

function parseGeneratedDraft(raw: string | null | undefined): Pick<GeneratedPromotionDraft, "title" | "summary"> | null {
  if (!raw?.trim()) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const title =
      typeof parsed.title === "string" ? parsed.title.replace(/\s+/g, " ").trim() : "";
    const summary =
      typeof parsed.summary === "string" ? parsed.summary.replace(/\s+/g, " ").trim() : "";

    if (!title || !summary) return null;
    if (title.length > PROMOTION_TITLE_MAX_LEN) return null;
    if (summary.length > PROMOTION_SUMMARY_MAX_LEN) return null;

    return { title, summary };
  } catch {
    return null;
  }
}

function aiAuth(): { token: string; endpoint: string; model: string } | null {
  const gateway = process.env.AI_GATEWAY_API_KEY?.trim();
  if (gateway) {
    return {
      token: gateway,
      endpoint: GATEWAY_URL,
      model:
        process.env.PROMOTION_COPY_MODEL ||
        process.env.CONTENT_TRANSLATION_MODEL ||
        DEFAULT_GATEWAY_MODEL,
    };
  }

  const requestOidc = headers().get("x-vercel-oidc-token")?.trim();
  const oidc = requestOidc || process.env.VERCEL_OIDC_TOKEN?.trim();
  if (oidc) {
    return {
      token: oidc,
      endpoint: GATEWAY_URL,
      model:
        process.env.PROMOTION_COPY_MODEL ||
        process.env.CONTENT_TRANSLATION_MODEL ||
        DEFAULT_GATEWAY_MODEL,
    };
  }

  const openai = process.env.OPENAI_API_KEY?.trim();
  if (openai) {
    return {
      token: openai,
      endpoint: OPENAI_CHAT_URL,
      model: process.env.PROMOTION_COPY_MODEL || "gpt-4o-mini",
    };
  }

  return null;
}

async function generateDraftWithAi(
  locale: PromotionLocale,
  row: PromotionDraftRequestRow,
): Promise<Pick<GeneratedPromotionDraft, "title" | "summary">> {
  const auth = aiAuth();
  if (!auth) throw new Error("PROMOTION_GENERATION_AUTH_MISSING");

  const requestPayload = {
    category: row.category_text,
    requested_service: row.requested_service,
    subcategory: row.subcategory_text,
    description: sanitizeFreeText(row.description),
    budget: sanitizeFreeText(row.client_budget_text),
    preferred_language: row.preferred_language,
    work_format: row.work_format,
    city: row.city,
    postal_code: row.postal_code,
    urgency: row.urgency,
    desired_date: row.desired_date,
    service_timing_type: row.service_timing_type,
    service_timing_date: row.service_timing_date,
    service_timing_time: row.service_timing_time,
    service_timing_date_end: row.service_timing_date_end,
    service_timing_period: row.service_timing_period,
    service_timing_note: sanitizeFreeText(row.service_timing_note),
  };

  const response = await fetch(auth.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      model: auth.model,
      stream: false,
      messages: [
        {
          role: "system",
          content: [
            "You write anonymized public live-demand cards for Freuly, a service marketplace in Germany.",
            `Write the public title and summary in ${LANGUAGE_NAMES[locale]}.`,
            "Use only facts explicitly present in the supplied service request.",
            "Never include or infer a person's name, email, phone number, social handle, exact street address, employer, account identifiers, or other identifying information.",
            "If identifying data appears inside free text, omit it rather than paraphrasing it.",
            "Keep broad location such as city or postal code only when useful for the service request.",
            "Keep the requested language, work format, timing and budget only when explicitly supplied and relevant.",
            "Do not invent qualifications, prices, dates, urgency, preferences, or circumstances.",
            "Write a natural concise demand card, not an internal note and not an advertisement for Freuly.",
            "Title: clear and specific, ideally 4-10 words.",
            "Summary: 1-3 short sentences with the core need and useful matching constraints.",
            'Return JSON only: {"title":"...","summary":"..."}.',
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify(requestPayload),
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  const payload = (await response.json()) as ChatResponse;
  if (!response.ok) {
    console.error("[promotion/generate] AI request failed", {
      status: response.status,
      message: payload.error?.message,
    });
    throw new Error("PROMOTION_GENERATION_GATEWAY_FAILED");
  }

  const generated = parseGeneratedDraft(payload.choices?.[0]?.message?.content);
  if (!generated) throw new Error("PROMOTION_GENERATION_INVALID_RESPONSE");
  return generated;
}

export async function generatePromotionDraftAdmin(
  serviceRequestId: string,
): Promise<GeneratedPromotionDraft> {
  await assertAdminSession();

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("service_requests")
    .select(PROMOTION_DRAFT_REQUEST_SELECT)
    .eq("id", serviceRequestId)
    .maybeSingle();

  if (error) {
    console.error("[promotion/generate] service request lookup failed", error);
    throw new Error("LOOKUP_FAILED");
  }

  if (!data) throw new Error("NOT_FOUND");

  const row = data as unknown as PromotionDraftRequestRow;
  const locale = sourceLocaleForRequest(row);
  const generated = await generateDraftWithAi(locale, row);

  return {
    locale,
    ...generated,
  };
}
