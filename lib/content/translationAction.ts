"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidContentSlug } from "@/lib/content/slug";
import {
  isContentLang,
  type ContentLang,
  type ContentPost,
} from "@/lib/content/types";

const ARTICLE_SELECT =
  "id, lang, slug, title, excerpt, body_markdown, content_type, status, hero_image_url, seo_title, seo_description, cta_type, cta_label, cta_href, published_at, created_at, updated_at";

const LANGUAGE_NAMES: Record<ContentLang, string> = {
  ru: "Russian",
  ua: "Ukrainian",
  de: "German",
};

const DEFAULT_MODEL = "openai/gpt-5-mini";

type TranslationPayload = {
  title: string;
  excerpt: string;
  body_markdown: string;
  seo_title: string | null;
  seo_description: string | null;
  cta_label: string | null;
};

type GatewayResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

function nullableText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function localizeFreulyUrls(value: string, targetLang: ContentLang): string {
  return value
    .replace(
      /(https?:\/\/(?:www\.)?freuly\.de)\/(?:ru|ua|de)(?=\/|$)/gi,
      `$1/${targetLang}`,
    )
    .replace(/(\]\()\/(?:ru|ua|de)(?=\/)/g, `$1/${targetLang}`);
}

function localizeCtaHref(value: string | null, targetLang: ContentLang): string | null {
  if (!value) return null;

  if (/^https?:\/\/(?:www\.)?freuly\.de\//i.test(value)) {
    return value.replace(
      /^(https?:\/\/(?:www\.)?freuly\.de)\/(?:ru|ua|de)(?=\/|$)/i,
      `$1/${targetLang}`,
    );
  }

  if (/^\/(?:ru|ua|de)(?=\/|$)/.test(value)) {
    return value.replace(/^\/(?:ru|ua|de)(?=\/|$)/, `/${targetLang}`);
  }

  return value;
}

function validateTranslation(value: unknown): TranslationPayload | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.title !== "string" ||
    !candidate.title.trim() ||
    typeof candidate.excerpt !== "string" ||
    typeof candidate.body_markdown !== "string"
  ) {
    return null;
  }

  const nullableFields = ["seo_title", "seo_description", "cta_label"] as const;
  for (const field of nullableFields) {
    const fieldValue = candidate[field];
    if (fieldValue !== null && typeof fieldValue !== "string") return null;
  }

  return {
    title: candidate.title.trim(),
    excerpt: candidate.excerpt.trim(),
    body_markdown: candidate.body_markdown.trim(),
    seo_title: nullableText(candidate.seo_title),
    seo_description: nullableText(candidate.seo_description),
    cta_label: nullableText(candidate.cta_label),
  };
}

async function translateArticle(
  source: ContentPost,
  targetLang: ContentLang,
): Promise<TranslationPayload> {
  const token = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if (!token) throw new Error("CONTENT_TRANSLATION_AUTH_MISSING");

  const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      model: process.env.CONTENT_TRANSLATION_MODEL || DEFAULT_MODEL,
      stream: false,
      messages: [
        {
          role: "system",
          content: [
            "You are the localization editor for Freuly Journal.",
            `Translate the supplied article into ${LANGUAGE_NAMES[targetLang]}.`,
            "Translate faithfully and naturally. Do not add, remove, soften, or invent facts.",
            "Keep the brand name Freuly unchanged.",
            "Preserve Markdown structure: headings, paragraphs, lists, emphasis, blockquotes and link syntax.",
            "Preserve URLs, email addresses, phone numbers and proper names exactly as written.",
            "Keep null fields null. Return only the requested structured JSON.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            source_language: LANGUAGE_NAMES[source.lang],
            target_language: LANGUAGE_NAMES[targetLang],
            title: source.title,
            excerpt: source.excerpt,
            body_markdown: source.body_markdown,
            seo_title: source.seo_title,
            seo_description: source.seo_description,
            cta_label: source.cta_label,
          }),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "freuly_article_translation",
          description: "Localized Freuly Journal article fields",
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              excerpt: { type: "string" },
              body_markdown: { type: "string" },
              seo_title: {
                anyOf: [{ type: "string" }, { type: "null" }],
              },
              seo_description: {
                anyOf: [{ type: "string" }, { type: "null" }],
              },
              cta_label: {
                anyOf: [{ type: "string" }, { type: "null" }],
              },
            },
            required: [
              "title",
              "excerpt",
              "body_markdown",
              "seo_title",
              "seo_description",
              "cta_label",
            ],
            additionalProperties: false,
          },
        },
      },
    }),
  });

  const payload = (await response.json()) as GatewayResponse;
  if (!response.ok) {
    console.error("[content/translation] gateway request failed", {
      status: response.status,
      message: payload.error?.message,
    });
    throw new Error("CONTENT_TRANSLATION_GATEWAY_FAILED");
  }

  const raw = payload.choices?.[0]?.message?.content;
  if (!raw) throw new Error("CONTENT_TRANSLATION_EMPTY_RESPONSE");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("CONTENT_TRANSLATION_INVALID_JSON");
  }

  const translated = validateTranslation(parsed);
  if (!translated) throw new Error("CONTENT_TRANSLATION_INVALID_PAYLOAD");

  return translated;
}

export async function ensureArticleTranslationAction(input: {
  sourceLang: string;
  targetLang: string;
  slug: string;
}): Promise<
  | { ok: true; href: string; created: boolean }
  | { ok: false; href: string; error: string }
> {
  const sourceLang = input.sourceLang;
  const targetLang = input.targetLang;
  const slug = input.slug.trim().toLowerCase();

  if (
    !isContentLang(sourceLang) ||
    !isContentLang(targetLang) ||
    !isValidContentSlug(slug)
  ) {
    return { ok: false, href: "/ru/blog", error: "INVALID_TRANSLATION_REQUEST" };
  }

  const sourceHref = `/${sourceLang}/blog/${slug}`;
  const targetHref = `/${targetLang}/blog/${slug}`;
  if (sourceLang === targetLang) {
    return { ok: true, href: targetHref, created: false };
  }

  const supabase = createSupabaseServerClient();

  const { data: existing, error: existingError } = await supabase
    .from("content_posts")
    .select("id, status")
    .eq("lang", targetLang)
    .eq("slug", slug)
    .maybeSingle();

  if (existingError) {
    console.error("[content/translation] target lookup failed", existingError);
    return { ok: false, href: sourceHref, error: "TARGET_LOOKUP_FAILED" };
  }

  if (existing?.status === "published") {
    return { ok: true, href: targetHref, created: false };
  }

  // Never overwrite an editor's unpublished work.
  if (existing?.status === "draft") {
    return { ok: false, href: sourceHref, error: "TARGET_DRAFT_EXISTS" };
  }

  const { data: sourceData, error: sourceError } = await supabase
    .from("content_posts")
    .select(ARTICLE_SELECT)
    .eq("lang", sourceLang)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (sourceError) {
    console.error("[content/translation] source lookup failed", sourceError);
    return { ok: false, href: sourceHref, error: "SOURCE_LOOKUP_FAILED" };
  }

  const source = (sourceData as ContentPost | null) ?? null;
  if (!source) {
    return { ok: false, href: `/${sourceLang}/blog`, error: "SOURCE_NOT_FOUND" };
  }

  let translated: TranslationPayload;
  try {
    translated = await translateArticle(source, targetLang);
  } catch (error) {
    console.error("[content/translation] translation failed", error);
    return { ok: false, href: sourceHref, error: "TRANSLATION_FAILED" };
  }

  const nowIso = new Date().toISOString();
  const { error: insertError } = await supabase.from("content_posts").insert({
    lang: targetLang,
    slug: source.slug,
    title: translated.title,
    excerpt: translated.excerpt,
    body_markdown: localizeFreulyUrls(translated.body_markdown, targetLang),
    content_type: source.content_type,
    status: "published",
    hero_image_url: source.hero_image_url,
    seo_title: translated.seo_title,
    seo_description: translated.seo_description,
    cta_type: source.cta_type,
    cta_label: translated.cta_label,
    cta_href: localizeCtaHref(source.cta_href, targetLang),
    published_at: source.published_at ?? nowIso,
    updated_at: nowIso,
  });

  if (insertError) {
    // A simultaneous request may have created the same translation first.
    if (insertError.code === "23505") {
      const { data: racedTranslation } = await supabase
        .from("content_posts")
        .select("id, status")
        .eq("lang", targetLang)
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      if (racedTranslation) {
        return { ok: true, href: targetHref, created: false };
      }
    }

    console.error("[content/translation] insert failed", insertError);
    return { ok: false, href: sourceHref, error: "TRANSLATION_SAVE_FAILED" };
  }

  revalidatePath(`/${targetLang}`);
  revalidatePath(`/${targetLang}/blog`);
  revalidatePath(targetHref);
  revalidatePath("/sitemap.xml");

  return { ok: true, href: targetHref, created: true };
}
