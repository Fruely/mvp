import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Shared generation logic for missing `de` / `uk` specialist translations,
 * ported from scripts/generate-de-uk-from-ru.mjs so the standalone script and
 * the protected cron/admin route share one implementation.
 *
 * ADR-001: additive inserts only; never updates existing translation rows.
 * Source language is always `ru` rows already present in the translation tables.
 */

const TARGET_LANGS = [
  { code: "de", deepl: "DE" },
  { code: "uk", deepl: "UK" }, // DeepL: Ukrainian
] as const;

const DEFAULT_PROFILE_BATCH = 40;
const DEFAULT_SERVICE_BATCH = 40;
const DEEPL_PAUSE_MS = 200;
const DEEPL_MAX_ATTEMPTS = 3;
const DEEPL_RETRY_BACKOFF_MS = 200;
const DEFAULT_DEEPL_API_URL = "https://api.deepl.com/v2/translate";

export type TranslationGenerationStats = {
  scanned_profiles: number;
  scanned_services: number;
  skipped_existing: number;
  translated_strings: number;
  inserted_profile_rows: number;
  inserted_service_rows: number;
  failed: number;
};

export type GenerateMissingTranslationsOptions = {
  supabase: SupabaseClient;
  deeplApiKey: string;
  deeplApiUrl?: string;
  profileBatch?: number;
  serviceBatch?: number;
  /** Optional safety caps so a single cron invocation stays bounded. */
  maxProfiles?: number | null;
  maxServices?: number | null;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Mask URLs, emails, and phone-like sequences; return text + tokens for unmask. */
function maskFragments(input: string): {
  masked: string;
  tokens: Array<{ token: string; replacement: string }>;
} {
  if (input == null || typeof input !== "string") {
    return { masked: "", tokens: [] };
  }
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
  if (!translated || !tokens.length) return translated;
  let out = translated;
  for (const { token, replacement } of tokens) {
    out = out.split(token).join(replacement);
  }
  return out;
}

function isDeepLRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

async function deepLTranslate(
  text: string,
  targetDeepl: string,
  apiKey: string,
  apiUrl: string
): Promise<string | null> {
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed) return null;

  const { masked, tokens } = maskFragments(trimmed);

  const headers = {
    Authorization: `DeepL-Auth-Key ${apiKey}`,
    "Content-Type": "application/json",
  };
  const body = JSON.stringify({
    text: [masked],
    target_lang: targetDeepl,
    source_lang: "RU",
  });

  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < DEEPL_MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await sleep(DEEPL_RETRY_BACKOFF_MS * attempt);
    }

    const res = await fetch(apiUrl, { method: "POST", headers, body });

    if (res.ok) {
      const data = (await res.json()) as {
        translations?: Array<{ text?: string }>;
      };
      const first = data?.translations?.[0]?.text;
      if (typeof first !== "string") {
        throw new Error("DeepL: unexpected response shape");
      }
      return unmask(first, tokens);
    }

    const errBody = await res.text();
    lastErr = new Error(`DeepL HTTP ${res.status}: ${errBody.slice(0, 500)}`);

    if (attempt < DEEPL_MAX_ATTEMPTS - 1 && isDeepLRetryableStatus(res.status)) {
      continue;
    }
    throw lastErr;
  }

  throw lastErr ?? new Error("DeepL: request failed");
}

async function targetRowExists(
  supabase: SupabaseClient,
  table: string,
  idColumn: string,
  idValue: string,
  langCode: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq(idColumn, idValue)
    .eq("language_code", langCode)
    .maybeSingle();

  if (error) throw error;
  return data != null;
}

/**
 * Generate missing `de`/`uk` rows from existing `ru` rows. Idempotent:
 * existing target rows are detected and skipped (no DeepL call, no overwrite).
 * Per-string DeepL failures are counted in `failed` and never throw out.
 */
export async function generateMissingDeUkTranslations(
  options: GenerateMissingTranslationsOptions
): Promise<TranslationGenerationStats> {
  const {
    supabase,
    deeplApiKey,
    deeplApiUrl = DEFAULT_DEEPL_API_URL,
    profileBatch = DEFAULT_PROFILE_BATCH,
    serviceBatch = DEFAULT_SERVICE_BATCH,
    maxProfiles = null,
    maxServices = null,
  } = options;

  const stats: TranslationGenerationStats = {
    scanned_profiles: 0,
    scanned_services: 0,
    skipped_existing: 0,
    translated_strings: 0,
    inserted_profile_rows: 0,
    inserted_service_rows: 0,
    failed: 0,
  };

  async function processProfileRuRow(row: {
    specialist_id: string;
    about_me: string | null;
  }): Promise<void> {
    stats.scanned_profiles += 1;
    const specialistId = row.specialist_id;
    const about = row.about_me;
    if (about == null || String(about).trim() === "") return;

    const now = new Date().toISOString();

    for (const { code, deepl } of TARGET_LANGS) {
      try {
        const exists = await targetRowExists(
          supabase,
          "specialist_profile_translations",
          "specialist_id",
          specialistId,
          code
        );
        if (exists) {
          stats.skipped_existing += 1;
          continue;
        }

        const translated = await deepLTranslate(about, deepl, deeplApiKey, deeplApiUrl);
        stats.translated_strings += 1;
        await sleep(DEEPL_PAUSE_MS);

        const { error: insErr } = await supabase
          .from("specialist_profile_translations")
          .upsert(
            {
              specialist_id: specialistId,
              language_code: code,
              about_me: translated,
              created_at: now,
              updated_at: now,
            },
            {
              onConflict: "specialist_id,language_code",
              ignoreDuplicates: true,
            }
          );

        if (insErr) {
          throw insErr;
        }
        stats.inserted_profile_rows += 1;
      } catch (e) {
        stats.failed += 1;
        console.error(
          `[generate-translations] profile specialist_id=${specialistId} lang=${code}:`,
          e instanceof Error ? e.message : e
        );
      }
    }
  }

  async function processServiceRuRow(row: {
    specialist_service_id: string;
    title: string | null;
    price_comment: string | null;
    description: string | null;
  }): Promise<void> {
    stats.scanned_services += 1;
    const serviceId = row.specialist_service_id;
    const title = row.title;
    if (title == null || String(title).trim() === "") return;

    const now = new Date().toISOString();

    for (const { code, deepl } of TARGET_LANGS) {
      try {
        const exists = await targetRowExists(
          supabase,
          "specialist_service_translations",
          "specialist_service_id",
          serviceId,
          code
        );
        if (exists) {
          stats.skipped_existing += 1;
          continue;
        }

        const tTitle = await deepLTranslate(title, deepl, deeplApiKey, deeplApiUrl);
        stats.translated_strings += 1;
        await sleep(DEEPL_PAUSE_MS);

        let tComment: string | null = null;
        if (row.price_comment != null && String(row.price_comment).trim() !== "") {
          tComment = await deepLTranslate(row.price_comment, deepl, deeplApiKey, deeplApiUrl);
          stats.translated_strings += 1;
          await sleep(DEEPL_PAUSE_MS);
        }

        let tDesc: string | null = null;
        if (row.description != null && String(row.description).trim() !== "") {
          tDesc = await deepLTranslate(row.description, deepl, deeplApiKey, deeplApiUrl);
          stats.translated_strings += 1;
          await sleep(DEEPL_PAUSE_MS);
        }

        const { error: insErr } = await supabase
          .from("specialist_service_translations")
          .upsert(
            {
              specialist_service_id: serviceId,
              language_code: code,
              title: tTitle ?? String(title).trim(),
              price_comment: tComment,
              description: tDesc,
              created_at: now,
              updated_at: now,
            },
            {
              onConflict: "specialist_service_id,language_code",
              ignoreDuplicates: true,
            }
          );

        if (insErr) {
          throw insErr;
        }
        stats.inserted_service_rows += 1;
      } catch (e) {
        stats.failed += 1;
        console.error(
          `[generate-translations] service specialist_service_id=${serviceId} lang=${code}:`,
          e instanceof Error ? e.message : e
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
      .eq("language_code", "ru")
      .range(offset, offset + profileBatch - 1);

    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      if (maxProfiles != null && stats.scanned_profiles >= maxProfiles) break;
      await processProfileRuRow(row as { specialist_id: string; about_me: string | null });
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
      .eq("language_code", "ru")
      .range(offset, offset + serviceBatch - 1);

    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      if (maxServices != null && stats.scanned_services >= maxServices) break;
      await processServiceRuRow(
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
