#!/usr/bin/env node
/**
 * Compatibility wrapper for the canonical translation cron.
 *
 * It intentionally contains no translation/provider mappings. Run against a
 * local app by default, or set TRANSLATION_CRON_URL explicitly.
 */

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

const cronSecret = requireEnv("CRON_SECRET");
const cronUrl =
  process.env.TRANSLATION_CRON_URL?.trim() ||
  "http://localhost:3000/api/cron/generate-translations";

const response = await fetch(cronUrl, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${cronSecret}`,
  },
});
const body = await response.text();

if (!response.ok) {
  console.error(`Translation generation failed (${response.status}): ${body}`);
  process.exit(1);
}

console.log(body);
