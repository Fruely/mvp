import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LOCALE_REGISTRY,
  toProviderLocale,
  type ContentLocale,
} from "@/lib/localization";

const DEFAULT_PROFILE_BATCH = 40;
const DEFAULT_SERVICE_BATCH = 40;
const DEFAULT_DEEPL_PAUSE_MS = 200;
const DEEPL_MAX_ATTEMPTS = 3;
const DEEPL_RETRY_BACKOFF_MS = 200;
const DEFAULT_DEEPL_API_URL = "https://api.deepl.com/v2/translate";

type TranslatableField = "about_me" | "title" | "description" | "price_comment";
type TranslationRow = {
  id?: string;
  about_me?: string | null;
  title?: string | null;
  description?: string | null;
  price_comment?: string | null;
};

export type TranslationGenerationStats = {
  scanned_profiles: number;
  scanned_services: number;
  skipped_existing: number;
  translated_strings: number;
  inserted_profile_rows: number;
  inserted_service_rows: number;
  updated_profile_rows: number;
  updated_service_rows: number;
  failed: number;
};

export type GenerateMissingTranslationsOptions = {
  supabase: SupabaseClient;
  deeplApiKey: string;
  sourceLocale: ContentLocale;
  targetLocales: readonly ContentLocale[];
  deeplApiUrl?: string;
  profileBatch?: number;
  serviceBatch?: number;
  deeplPauseMs?: number;
  /** Optional safety caps so a single cron invocation stays bounded. */
  maxProfiles?: number | null;
  maxServices?: number | null;
};

function isContentLocale(value: unknown): value is ContentLocale {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(LOCALE_REGISTRY, value)
  );
}

export function resolveTargetLocales(
  sourceLocale: ContentLocale,
  targetLocales: readonly ContentLocale[]
): ContentLocale[] {
  if (!isContentLocale(sourceLocale)) {
    throw new Error(`Unsupported source locale: ${String(sourceLocale)}`);
  }

  const result: ContentLocale[] = [];
  for (const locale of targetLocales) {
    if (!isContentLocale(locale)) {
      throw new Error(`Unsupported target locale: ${String(locale)}`);
    }
    if (locale !== sourceLocale && !result.includes(locale)) {
      result.push(locale);
    }
  }
  return result;
}

function nonEmpty(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function sleep(ms: number): Promise<void> {
  return ms > 0
    ? new Promise((resolve) => setTimeout(resolve, ms))
    : Promise.resolve();
}

/** Mask URLs, emails, and phone-like sequences; return text + tokens for unmask. */
function maskFragments(input: string): {
  masked: string;
  tokens: Array<{ token: string; replacement: string }>;
} {
  let s = input;
  const tokens: Array<{ token: string; replacement: string }> = [];
  let i = 0;
  const push = (replacement: string): string => {
    const token = `__MASK_${i}__`;
    tokens.push({ token, replacement });
    i += 1;
    return token;
  };

  s = s.replace(/https?:\/\/[^\s<>"{}|\\^`[\]]+/gi, (m) => push(m));
  s = s.replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, (m) => push(m));
  s = s.replace(
    /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{2,6}/g,
    (m) => {
      const digits = m.replace(/\D/g, "");
      return digits.length >= 8 ? push(m) : m;
    }
  );

  return { masked: s, tokens };
}

function unmask(
  translated: string,
  tokens: Array<{ token: string; replacement: string }>
): string {
  let out = translated;
  for (const { token, replacement } of tokens) {
    out = out.split(token).join(replacement);
  }
  return out;
}

function isDeepLRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

async function deepLTranslate(args: {
  text: string;
  sourceLocale: ContentLocale;
  targetLocale: ContentLocale;
  apiKey: string;
  apiUrl: string;
}): Promise<string> {
  const { masked, tokens } = maskFragments(args.text);
  const body = JSON.stringify({
    text: [masked],
    source_lang: toProviderLocale(args.sourceLocale, "deepl"),
    target_lang: toProviderLocale(args.targetLocale, "deepl"),
  });
  const headers = {
    Authorization: `DeepL-Auth-Key ${args.apiKey}`,
    "Content-Type": "application/json",
  };

  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < DEEPL_MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await sleep(DEEPL_RETRY_BACKOFF_MS * attempt);
    }

    const response = await fetch(args.apiUrl, { method: "POST", headers, body });
    if (response.ok) {
      const data = (await response.json()) as {
        translations?: Array<{ text?: string }>;
      };
      const translated = data?.translations?.[0]?.text;
      if (typeof translated !== "string") {
        throw new Error("DeepL: unexpected response shape");
      }
      return unmask(translated, tokens);
    }

    const errorBody = await response.text();
    lastErr = new Error(
      `DeepL HTTP ${response.status}: ${errorBody.slice(0, 500)}`
    );
    if (
      attempt < DEEPL_MAX_ATTEMPTS - 1 &&
      isDeepLRetryableStatus(response.status)
    ) {
      continue;
    }
    throw lastErr;
  }

  throw lastErr ?? new Error("DeepL: request failed");
}

async function loadTargetRow(args: {
  supabase: SupabaseClient;
  table: string;
  idColumn: string;
  idValue: string;
  locale: ContentLocale;
  fields: readonly TranslatableField[];
}): Promise<TranslationRow | null> {
  const { data, error } = await args.supabase
    .from(args.table)
    .select(["id", ...args.fields].join(", "))
    .eq(args.idColumn, args.idValue)
    .eq("language_code", args.locale)
    .maybeSingle();
  if (error) throw error;
  return (data as TranslationRow | null) ?? null;
}

async function translateMissingFields(args: {
  source: TranslationRow;
  target: TranslationRow | null;
  fields: readonly TranslatableField[];
  sourceLocale: ContentLocale;
  targetLocale: ContentLocale;
  deeplApiKey: string;
  deeplApiUrl: string;
  deeplPauseMs: number;
  stats: TranslationGenerationStats;
}): Promise<Partial<Record<TranslatableField, string>>> {
  const translated: Partial<Record<TranslatableField, string>> = {};
  for (const field of args.fields) {
    const sourceValue = nonEmpty(args.source[field]);
    const targetValue = nonEmpty(args.target?.[field]);
    if (!sourceValue || targetValue) continue;

    translated[field] = await deepLTranslate({
      text: sourceValue,
      sourceLocale: args.sourceLocale,
      targetLocale: args.targetLocale,
      apiKey: args.deeplApiKey,
      apiUrl: args.deeplApiUrl,
    });
    args.stats.translated_strings += 1;
    await sleep(args.deeplPauseMs);
  }
  return translated;
}

async function writeMissingFields(args: {
  supabase: SupabaseClient;
  table: string;
  idColumn: string;
  idValue: string;
  targetLocale: ContentLocale;
  target: TranslationRow | null;
  translated: Partial<Record<TranslatableField, string>>;
}): Promise<"inserted" | "updated" | "skipped"> {
  const fields = Object.keys(args.translated) as TranslatableField[];
  if (fields.length === 0) return "skipped";

  const now = new Date().toISOString();
  if (!args.target) {
    const { error } = await args.supabase.from(args.table).upsert(
      {
        [args.idColumn]: args.idValue,
        language_code: args.targetLocale,
        ...args.translated,
        created_at: now,
        updated_at: now,
      },
      {
        onConflict: `${args.idColumn},language_code`,
        ignoreDuplicates: true,
      }
    );
    if (error) throw error;
    return "inserted";
  }
  if (!args.target.id) {
    throw new Error(`Translation row in ${args.table} is missing id`);
  }

  let query = args.supabase
    .from(args.table)
    .update({ ...args.translated, updated_at: now })
    .eq("id", args.target.id);
  // Optimistic guards ensure a concurrent non-empty write is never overwritten.
  for (const field of fields) {
    const original = args.target[field];
    query =
      original == null
        ? query.is(field, null)
        : query.eq(field, original);
  }
  const { error } = await query;
  if (error) throw error;
  return "updated";
}

export async function generateMissingTranslations(
  options: GenerateMissingTranslationsOptions
): Promise<TranslationGenerationStats> {
  const {
    supabase,
    deeplApiKey,
    sourceLocale,
    deeplApiUrl = DEFAULT_DEEPL_API_URL,
    profileBatch = DEFAULT_PROFILE_BATCH,
    serviceBatch = DEFAULT_SERVICE_BATCH,
    deeplPauseMs = DEFAULT_DEEPL_PAUSE_MS,
    maxProfiles = null,
    maxServices = null,
  } = options;
  const targetLocales = resolveTargetLocales(
    sourceLocale,
    options.targetLocales
  );
  const stats: TranslationGenerationStats = {
    scanned_profiles: 0,
    scanned_services: 0,
    skipped_existing: 0,
    translated_strings: 0,
    inserted_profile_rows: 0,
    inserted_service_rows: 0,
    updated_profile_rows: 0,
    updated_service_rows: 0,
    failed: 0,
  };

  async function processProfile(row: {
    specialist_id: string;
    about_me: string | null;
  }): Promise<void> {
    stats.scanned_profiles += 1;
    if (!nonEmpty(row.about_me)) return;

    for (const targetLocale of targetLocales) {
      try {
        const target = await loadTargetRow({
          supabase,
          table: "specialist_profile_translations",
          idColumn: "specialist_id",
          idValue: row.specialist_id,
          locale: targetLocale,
          fields: ["about_me"],
        });
        const translated = await translateMissingFields({
          source: row,
          target,
          fields: ["about_me"],
          sourceLocale,
          targetLocale,
          deeplApiKey,
          deeplApiUrl,
          deeplPauseMs,
          stats,
        });
        const result = await writeMissingFields({
          supabase,
          table: "specialist_profile_translations",
          idColumn: "specialist_id",
          idValue: row.specialist_id,
          targetLocale,
          target,
          translated,
        });
        if (result === "inserted") stats.inserted_profile_rows += 1;
        else if (result === "updated") stats.updated_profile_rows += 1;
        else stats.skipped_existing += 1;
      } catch (error) {
        stats.failed += 1;
        console.error(
          `[generate-translations] profile specialist_id=${row.specialist_id} lang=${targetLocale}:`,
          error instanceof Error ? error.message : error
        );
      }
    }
  }

  async function processService(row: {
    specialist_service_id: string;
    title: string | null;
    price_comment: string | null;
    description: string | null;
  }): Promise<void> {
    stats.scanned_services += 1;
    if (!nonEmpty(row.title)) return;

    for (const targetLocale of targetLocales) {
      try {
        const target = await loadTargetRow({
          supabase,
          table: "specialist_service_translations",
          idColumn: "specialist_service_id",
          idValue: row.specialist_service_id,
          locale: targetLocale,
          fields: ["title", "price_comment", "description"],
        });
        const translated = await translateMissingFields({
          source: row,
          target,
          fields: ["title", "price_comment", "description"],
          sourceLocale,
          targetLocale,
          deeplApiKey,
          deeplApiUrl,
          deeplPauseMs,
          stats,
        });
        const result = await writeMissingFields({
          supabase,
          table: "specialist_service_translations",
          idColumn: "specialist_service_id",
          idValue: row.specialist_service_id,
          targetLocale,
          target,
          translated,
        });
        if (result === "inserted") stats.inserted_service_rows += 1;
        else if (result === "updated") stats.updated_service_rows += 1;
        else stats.skipped_existing += 1;
      } catch (error) {
        stats.failed += 1;
        console.error(
          `[generate-translations] service specialist_service_id=${row.specialist_service_id} lang=${targetLocale}:`,
          error instanceof Error ? error.message : error
        );
      }
    }
  }

  let offset = 0;
  for (;;) {
    if (maxProfiles != null && stats.scanned_profiles >= maxProfiles) break;
    const { data, error } = await supabase
      .from("specialist_profile_translations")
      .select("specialist_id, about_me, language_code")
      .eq("language_code", sourceLocale)
      .range(offset, offset + profileBatch - 1);
    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      if (maxProfiles != null && stats.scanned_profiles >= maxProfiles) break;
      await processProfile(
        row as { specialist_id: string; about_me: string | null }
      );
    }
    if (data.length < profileBatch) break;
    offset += profileBatch;
  }

  offset = 0;
  for (;;) {
    if (maxServices != null && stats.scanned_services >= maxServices) break;
    const { data, error } = await supabase
      .from("specialist_service_translations")
      .select("specialist_service_id, title, price_comment, description, language_code")
      .eq("language_code", sourceLocale)
      .range(offset, offset + serviceBatch - 1);
    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      if (maxServices != null && stats.scanned_services >= maxServices) break;
      await processService(
        row as {
          specialist_service_id: string;
          title: string | null;
          price_comment: string | null;
          description: string | null;
        }
      );
    }
    if (data.length < serviceBatch) break;
    offset += serviceBatch;
  }

  return stats;
}
