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
  console.error('Missing Supabase env variables.');
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

async function count(table) {
  const rows = await supabaseRequest(`${table}?select=id&limit=10000`);
  return rows.length;
}

async function deleteAll(table) {
  if (!SHOULD_WRITE) return [];
  return supabaseRequest(`${table}?id=not.is.null`, { method: 'DELETE' });
}

async function main() {
  console.log(SHOULD_WRITE ? 'FULL Growth cleanup mode: WRITE' : 'FULL Growth cleanup mode: DRY RUN');

  const tables = [
    'content_tasks',
    'scout_prospects',
    'market_signals',
    'category_opportunities',
  ];

  const before = {};

  for (const table of tables) {
    before[table] = await count(table);
  }

  console.log('Rows before cleanup:');
  console.log(JSON.stringify(before, null, 2));

  if (!SHOULD_WRITE) {
    console.log('\nDry run only. Add --write to delete ALL Growth data from Supabase.');
    return;
  }

  console.log('\nDeleting ALL Growth data from Supabase...');

  // Order matters because category_opportunities is calculated from market_signals.
  const deleted = {};
  deleted.content_tasks = (await deleteAll('content_tasks')).length;
  deleted.scout_prospects = (await deleteAll('scout_prospects')).length;
  deleted.market_signals = (await deleteAll('market_signals')).length;
  deleted.category_opportunities = (await deleteAll('category_opportunities')).length;

  console.log('Deleted rows:');
  console.log(JSON.stringify(deleted, null, 2));

  const after = {};
  for (const table of tables) {
    after[table] = await count(table);
  }

  console.log('Rows after cleanup:');
  console.log(JSON.stringify(after, null, 2));
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
