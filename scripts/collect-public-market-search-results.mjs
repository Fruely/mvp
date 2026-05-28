#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';

const SHOULD_WRITE = process.argv.includes('--write');
const MAX_QUERIES = Number(process.env.PUBLIC_SEARCH_MAX_QUERIES || 10);
const RESULTS_PER_QUERY = Number(process.env.PUBLIC_SEARCH_RESULTS_PER_QUERY || 10);

function loadEnv() {
  if (!fs.existsSync('.env.local')) return;

  for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const index = trimmed.indexOf('=');
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();

    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const provider = process.env.PUBLIC_SEARCH_PROVIDER || 'serpapi';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const serpapiKey = process.env.SERPAPI_API_KEY;

function requireEnv(name, value) {
  if (!value) {
    console.error(`Missing required env variable: ${name}`);
    process.exit(1);
  }
}

requireEnv('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL', supabaseUrl);
requireEnv('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY', supabaseKey);

if (provider !== 'serpapi') {
  console.error(`Unsupported PUBLIC_SEARCH_PROVIDER: ${provider}. Use PUBLIC_SEARCH_PROVIDER=serpapi`);
  process.exit(1);
}

requireEnv('SERPAPI_API_KEY', serpapiKey);

const baseUrl = supabaseUrl.replace(/\/$/, '');

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Supabase error ${response.status}: ${text}`);
  }

  return text ? JSON.parse(text) : [];
}

function hashRawItem(item) {
  const raw = [
    item.source_platform || '',
    item.source_type || '',
    item.source_url || '',
    item.source_title || '',
    item.source_text || '',
    item.search_query || '',
  ].join('|').toLowerCase().trim();

  return crypto.createHash('sha256').update(raw).digest('hex');
}

function guessPlatformFromUrl(url) {
  const value = String(url || '').toLowerCase();

  if (value.includes('t.me/') || value.includes('telegram')) return 'telegram';
  if (value.includes('facebook.com')) return 'facebook';
  if (value.includes('instagram.com')) return 'instagram';
  if (value.includes('threads.net')) return 'threads';
  if (value.includes('kleinanzeigen.de')) return 'kleinanzeigen';

  return 'web';
}

async function getEnabledQueries() {
  return supabaseRequest(
    `market_search_queries?enabled=eq.true&select=*&order=priority.desc&limit=${MAX_QUERIES}`
  );
}

async function serpapiSearch(query) {
  const params = new URLSearchParams({
    engine: 'google',
    q: query,
    api_key: serpapiKey,
    google_domain: 'google.de',
    gl: 'de',
    hl: 'ru',
    num: String(RESULTS_PER_QUERY),
  });

  const response = await fetch(`https://serpapi.com/search.json?${params}`);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`SerpApi error ${response.status}: ${text}`);
  }

  const data = text ? JSON.parse(text) : {};

  if (data.error) {
    throw new Error(`SerpApi error: ${data.error}`);
  }

  return data;
}

function toRawMarketItemsFromSerpApi(searchQuery, data) {
  const results = data.organic_results || [];

  return results.map((result, index) => {
    const sourceUrl = result.link || '';
    const sourceTitle = result.title || '';
    const snippet = result.snippet || '';
    const richSnippet = result.rich_snippet
      ? JSON.stringify(result.rich_snippet)
      : '';

    const sourceText = [sourceTitle, snippet, richSnippet]
      .filter(Boolean)
      .join('\n')
      .trim();

    const row = {
      source_platform: guessPlatformFromUrl(sourceUrl),
      source_type: 'search_result',
      source_url: sourceUrl || null,
      source_title: sourceTitle || null,
      source_text: sourceText || sourceUrl || searchQuery.query,

      search_query_id: searchQuery.id,
      search_query: searchQuery.query,

      country: searchQuery.country || 'Germany',
      region: searchQuery.region || null,
      city_candidate: null,
      language_hint: searchQuery.language_hint || null,

      category_hint: searchQuery.category_hint || null,
      subcategory_hint: searchQuery.subcategory_hint || null,
      intent_hint: searchQuery.intent_hint || null,

      provider: 'serpapi',
      provider_rank: index + 1,
      raw_payload: result || {},
      status: 'new',
      notes: 'Collected by public search collector',
    };

    row.raw_hash = hashRawItem(row);
    return row;
  });
}

async function findExistingRawHashes(hashes) {
  if (hashes.length === 0) return new Set();

  const existing = new Set();

  for (const hash of hashes) {
    const rows = await supabaseRequest(
      `raw_market_items?select=raw_hash&raw_hash=eq.${encodeURIComponent(hash)}&limit=1`
    );

    if (rows.length > 0) existing.add(hash);
  }

  return existing;
}

async function insertRawItems(rows) {
  if (rows.length === 0) return [];

  return supabaseRequest('raw_market_items', {
    method: 'POST',
    body: JSON.stringify(rows),
  });
}

async function updateQueryRunStats(queryId) {
  if (!SHOULD_WRITE) return;

  const rows = await supabaseRequest(
    `market_search_queries?select=run_count&id=eq.${queryId}&limit=1`
  );

  const currentRunCount = Number(rows[0]?.run_count || 0);

  await supabaseRequest(`market_search_queries?id=eq.${queryId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      last_run_at: new Date().toISOString(),
      run_count: currentRunCount + 1,
      updated_at: new Date().toISOString(),
    }),
  });
}

async function main() {
  console.log(SHOULD_WRITE ? 'Public search collector: WRITE' : 'Public search collector: DRY RUN');
  console.log(`Provider: ${provider}`);

  const queries = await getEnabledQueries();
  console.log(`Enabled search queries: ${queries.length}`);

  let collected = 0;
  let inserted = 0;
  let skippedDuplicates = 0;

  for (const query of queries) {
    console.log(`\nSearching: ${query.query}`);

    const data = await serpapiSearch(query.query);
    const rawItems = toRawMarketItemsFromSerpApi(query, data);

    collected += rawItems.length;

    const hashes = rawItems.map((row) => row.raw_hash);
    const existingHashes = await findExistingRawHashes(hashes);

    const newRows = rawItems.filter((row) => !existingHashes.has(row.raw_hash));
    skippedDuplicates += rawItems.length - newRows.length;

    console.log(`Results: ${rawItems.length}. New: ${newRows.length}. Duplicates: ${rawItems.length - newRows.length}.`);

    if (SHOULD_WRITE && newRows.length > 0) {
      const created = await insertRawItems(newRows);
      inserted += created.length;
      console.log(`Inserted raw items: ${created.length}`);
    }

    await updateQueryRunStats(query.id);
  }

  console.log('\nPublic search collection summary:');
  console.log(JSON.stringify({
    provider,
    collected,
    inserted,
    skippedDuplicates,
  }, null, 2));

  if (!SHOULD_WRITE) {
    console.log('\nDry run only. Add --write to insert raw_market_items.');
  }
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
