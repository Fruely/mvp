import "server-only";

import { type PromotionLocale } from "./promotionConstants";
import { fillMissingLocalizedCopies, type PublicCopyFields } from "./localizedPublicCopy";

const LANGUAGE_NAMES: Record<PromotionLocale, string> = {
  ru: "Russian",
  ua: "Ukrainian",
  de: "German",
};

const DEFAULT_GATEWAY_MODEL = "openai/gpt-5-mini";
const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

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

function parseCopyPayload(raw: string | null | undefined): PublicCopyFields | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const title = typeof parsed.title === "string" ? parsed.title.replace(/\s+/g, " ").trim() : "";
    const summary =
      typeof parsed.summary === "string" ? parsed.summary.replace(/\s+/g, " ").trim() : "";
    if (!title || !summary) return null;
    return { title, summary };
  } catch {
    return null;
  }
}

function translationToken(): { token: string; endpoint: string; model: string } | null {
  const gateway = process.env.AI_GATEWAY_API_KEY?.trim();
  if (gateway) {
    return {
      token: gateway,
      endpoint: GATEWAY_URL,
      model: process.env.CONTENT_TRANSLATION_MODEL || DEFAULT_GATEWAY_MODEL,
    };
  }

  const oidc = process.env.VERCEL_OIDC_TOKEN?.trim();
  if (oidc) {
    return {
      token: oidc,
      endpoint: GATEWAY_URL,
      model: process.env.CONTENT_TRANSLATION_MODEL || DEFAULT_GATEWAY_MODEL,
    };
  }

  const openai = process.env.OPENAI_API_KEY?.trim();
  if (openai) {
    return {
      token: openai,
      endpoint: OPENAI_CHAT_URL,
      model: process.env.CONTENT_TRANSLATION_MODEL || "gpt-4o-mini",
    };
  }

  return null;
}

export async function translatePublicCopyPair(
  sourceLocale: PromotionLocale,
  targetLocale: PromotionLocale,
  source: PublicCopyFields,
): Promise<PublicCopyFields | null> {
  if (sourceLocale === targetLocale) return source;
  const auth = translationToken();
  if (!auth) return null;

  try {
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
              "You localize anonymized Freuly live-demand cards.",
              `Translate title and summary from ${LANGUAGE_NAMES[sourceLocale]} into ${LANGUAGE_NAMES[targetLocale]}.`,
              "Translate only the supplied public_title and public_summary.",
              "Do not invent client contacts, names, phones, emails, or extra facts.",
              "Keep Freuly unchanged. Return JSON {\"title\":\"...\",\"summary\":\"...\"} only.",
            ].join(" "),
          },
          {
            role: "user",
            content: JSON.stringify({
              source_language: LANGUAGE_NAMES[sourceLocale],
              target_language: LANGUAGE_NAMES[targetLocale],
              title: source.title,
              summary: source.summary,
            }),
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    const payload = (await response.json()) as ChatResponse;
    if (!response.ok) {
      console.error("[promotion/translate] request failed", {
        status: response.status,
        message: payload.error?.message,
      });
      return null;
    }

    return parseCopyPayload(payload.choices?.[0]?.message?.content);
  } catch (error) {
    console.error("[promotion/translate] unexpected error", error);
    return null;
  }
}

export async function prepareLocalizedCopiesForPublish(args: {
  sourceLocale: PromotionLocale;
  title: string;
  summary: string;
  existing?: unknown;
}) {
  return fillMissingLocalizedCopies({
    ...args,
    translate: translatePublicCopyPair,
  });
}
