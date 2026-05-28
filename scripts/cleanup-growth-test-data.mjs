#!/usr/bin/env node

import fs from 'node:fs';

const SHOULD_WRITE = process.argv.includes('--write');

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

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Missing Supabase env variables. Expected NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  );
  process.exit(1);
}

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

async function count(path) {
  const rows = await supabaseRequest(`${path}&select=id&limit=10000`);
  return rows.length;
}

async function deleteRows(path) {
  if (!SHOULD_WRITE) return [];

  return supabaseRequest(path, {
    method: 'DELETE',
  });
}

async function main() {
  console.log(SHOULD_WRITE ? 'Cleanup mode: WRITE' : 'Cleanup mode: DRY RUN');

  const counts = {
    market_signals: await count('market_signals?notes=eq.Inserted by local Market Signal Processor'),
    scout_prospects: await count('scout_prospects?notes=eq.Created automatically from supply market signal by local Market Signal Processor'),
    content_tasks_demand: await count('content_tasks?notes=eq.Created automatically from demand market signal by local Market Signal Processor'),
    content_tasks_supply: await count('content_tasks?notes=eq.Created automatically from supply market signal by local Market Signal Processor'),
    content_tasks_aggregated: await count('content_tasks?notes=ilike.*Aggregated automatically from additional market signal*'),
    category_opportunities: await count('category_opportunities?'),
  };

  console.log('Rows that will be affected:');
  console.log(JSON.stringify(counts, null, 2));

  if (!SHOULD_WRITE) {
    console.log('\nDry run only. Add --write to delete test Growth data from Supabase.');
    return;
  }

  console.log('\nDeleting test Growth data from Supabase...');

  const deletedContentDemand = await deleteRows(
    'content_tasks?notes=eq.Created automatically from demand market signal by local Market Signal Processor'
  );

  const deletedContentSupply = await deleteRows(
    'content_tasks?notes=eq.Created automatically from supply market signal by local Market Signal Processor'
  );

  const deletedContentAggregated = await deleteRows(
    'content_tasks?notes=ilike.*Aggregated automatically from additional market signal*'
  );

  const deletedScoutProspects = await deleteRows(
    'scout_prospects?notes=eq.Created automatically from supply market signal by local Market Signal Processor'
  );

  const deletedMarketSignals = await deleteRows(
    'market_signals?notes=eq.Inserted by local Market Signal Processor'
  );

  const deletedCategoryOpportunities = await deleteRows(
    'category_opportunities?id=not.is.null'
  );

  console.log('Deleted rows:');
  console.log(JSON.stringify({
    content_tasks_demand: deletedContentDemand.length,
    content_tasks_supply: deletedContentSupply.length,
    content_tasks_aggregated: deletedContentAggregated.length,
    scout_prospects: deletedScoutProspects.length,
    market_signals: deletedMarketSignals.length,
    category_opportunities: deletedCategoryOpportunities.length,
  }, null, 2));

  console.log('\nSupabase Growth test data cleanup completed.');
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
