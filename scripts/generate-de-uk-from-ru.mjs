#!/usr/bin/env node
/**
 * Standalone: generate missing `de` and `uk` rows from existing `ru` rows in
 * specialist_profile_translations and specialist_service_translations.
 *
 * ADR-001: additive inserts only; never updates existing translation rows.
 *
 * Manual run (from repository root, with env loaded):
 *
 *   export NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
 *   export SUPABASE_SERVICE_ROLE_KEY="..."
 *   export DEEPL_API_KEY="..."
 *   # optional — use https://api-free.deepl.com/v2/translate for Free API keys
 *   # export DEEPL_API_URL="https://api-free.deepl.com/v2/translate"
 *
 *   node scripts/generate-de-uk-from-ru.mjs
 */

import { createClient } from "@supabase/supabase-js";

const TARGET_LANGS = [
  { code: "de", deepl: "DE" },
  { code: "uk", deepl: "UK" }, // DeepL: Ukrainian
];

const PROFILE_BATCH = 40;
const SERVICE_BATCH = 40;
const DEEPL_PAUSE_MS = 200;
const DEEPL_MAX_ATTEMPTS = 3;
const DEEPL_RETRY_BACKOFF_MS = 200;

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return String(v).trim();
}

/** Mask URLs, emails, and phone-like sequences; return text + list for unmask. */
function maskFragments(input) {
  if (input == null || typeof input !== "string") {
    return { masked: "", tokens: [] };
  }
  let s = input;
  const tokens = [];
  let i = 0;
  const push = (replacement) => {
    const token = `__MASK_${i}__`;
    tokens.push({ token, replacement });
    i += 1;
    return token;
  };

  s = s.replace(/https?:\/\/[^\s<>"{}|\\^`[\]]+/gi, (m) => push(m));
  s = s.replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, (m) => push(m));
  s = s.replace(/(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{2,6}/g, (m) => {
    const digits = m.replace(/\D/g, "");
    return digits.length >= 8 ? push(m) : m;
  });

  return { masked: s, tokens };
}

function unmask(translated, tokens) {
  if (!translated || !tokens.length) return translated;
  let out = translated;
  for (const { token, replacement } of tokens) {
    out = out.split(token).join(replacement);
  }
  return out;
}

function isDeepLRetryableStatus(status) {
  return status === 429 || (status >= 500 && status <= 599);
}

async function deepLTranslate(text, targetDeepl, apiKey, apiUrl) {
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

  let lastErr = null;
  for (let attempt = 0; attempt < DEEPL_MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await sleep(DEEPL_RETRY_BACKOFF_MS * attempt);
    }

    const res = await fetch(apiUrl, {
      method: "POST",
      headers,
      body,
    });

    if (res.ok) {
      const data = await res.json();
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

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function targetRowExists(supabase, table, idColumn, idValue, langCode) {
  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq(idColumn, idValue)
    .eq("language_code", langCode)
    .maybeSingle();

  if (error) throw error;
  return data != null;
}

async function main() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const deeplKey = requireEnv("DEEPL_API_KEY");
  const deeplUrl =
    process.env.DEEPL_API_URL?.trim() || "https://api.deepl.com/v2/translate";

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stats = {
    scanned_profiles: 0,
    scanned_services: 0,
    skipped_existing: 0,
    translated_strings: 0,
    inserted_profile_rows: 0,
    inserted_service_rows: 0,
    failed: 0,
  };

  async function processProfileRuRow(row) {
    stats.scanned_profiles += 1;
    const specialistId = row.specialist_id;
    const about = row.about_me;
    if (about == null || String(about).trim() === "") return;

    const now = new Date().toISOString();

    for (const { code, deepl } of TARGET_LANGS) {
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

      try {
        const translated = await deepLTranslate(about, deepl, deeplKey, deeplUrl);
        stats.translated_strings += 1;
        await sleep(DEEPL_PAUSE_MS);

        const { error: insErr } = await supabase
          .from("specialist_profile_translations")
          .insert({
            specialist_id: specialistId,
            language_code: code,
            about_me: translated,
            created_at: now,
            updated_at: now,
          });

        if (insErr) {
          if (insErr.code === "23505" || /duplicate|unique/i.test(insErr.message || "")) {
            stats.skipped_existing += 1;
          } else {
            throw insErr;
          }
        } else {
          stats.inserted_profile_rows += 1;
        }
      } catch (e) {
        stats.failed += 1;
        console.error(
          `[profile] specialist_id=${specialistId} lang=${code}:`,
          e?.message || e
        );
      }
    }
  }

  async function processServiceRuRow(row) {
    stats.scanned_services += 1;
    const serviceId = row.specialist_service_id;
    const title = row.title;
    if (title == null || String(title).trim() === "") return;

    const now = new Date().toISOString();

    for (const { code, deepl } of TARGET_LANGS) {
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

      try {
        const tTitle = await deepLTranslate(title, deepl, deeplKey, deeplUrl);
        stats.translated_strings += 1;
        await sleep(DEEPL_PAUSE_MS);

        let tComment = null;
        if (row.price_comment != null && String(row.price_comment).trim() !== "") {
          tComment = await deepLTranslate(row.price_comment, deepl, deeplKey, deeplUrl);
          stats.translated_strings += 1;
          await sleep(DEEPL_PAUSE_MS);
        }

        let tDesc = null;
        if (row.description != null && String(row.description).trim() !== "") {
          tDesc = await deepLTranslate(row.description, deepl, deeplKey, deeplUrl);
          stats.translated_strings += 1;
          await sleep(DEEPL_PAUSE_MS);
        }

        const { error: insErr } = await supabase
          .from("specialist_service_translations")
          .insert({
            specialist_service_id: serviceId,
            language_code: code,
            title: tTitle ?? String(title).trim(),
            price_comment: tComment,
            description: tDesc,
            created_at: now,
            updated_at: now,
          });

        if (insErr) {
          if (insErr.code === "23505" || /duplicate|unique/i.test(insErr.message || "")) {
            stats.skipped_existing += 1;
          } else {
            throw insErr;
          }
        } else {
          stats.inserted_service_rows += 1;
        }
      } catch (e) {
        stats.failed += 1;
        console.error(
          `[service] specialist_service_id=${serviceId} lang=${code}:`,
          e?.message || e
        );
      }
    }
  }

  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("specialist_profile_translations")
      .select("specialist_id, about_me, language_code")
      .eq("language_code", "ru")
      .range(offset, offset + PROFILE_BATCH - 1);

    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      await processProfileRuRow(row);
    }

    if (data.length < PROFILE_BATCH) break;
    offset += PROFILE_BATCH;
  }

  offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("specialist_service_translations")
      .select("specialist_service_id, title, price_comment, description, language_code")
      .eq("language_code", "ru")
      .range(offset, offset + SERVICE_BATCH - 1);

    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      await processServiceRuRow(row);
    }

    if (data.length < SERVICE_BATCH) break;
    offset += SERVICE_BATCH;
  }

  console.log("Done. Summary:");
  console.log(JSON.stringify(stats, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
