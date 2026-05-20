#!/usr/bin/env node

import fs from 'node:fs';

function loadEnv() {
  if (!fs.existsSync('.env.local')) return;

  for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const index = trimmed.indexOf('=');
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const baserowToken = process.env.BASEROW_API_TOKEN;
const tableId = process.env.BASEROW_MARKET_SIGNALS_TABLE_ID;
const baserowApiBase = process.env.BASEROW_API_BASE || 'https://api.baserow.io';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const allowedStatuses = new Set(['new', 'in_progress', 'done', 'ignored']);

function requireEnv(name, value) {
  if (!value) {
    console.error(`Missing required env variable: ${name}`);
    process.exit(1);
  }
}

requireEnv('BASEROW_API_TOKEN', baserowToken);
requireEnv('BASEROW_MARKET_SIGNALS_TABLE_ID', tableId);
requireEnv('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL', supabaseUrl);
requireEnv('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY', supabaseKey);

function normalizeStatus(value) {
  if (value === null || value === undefined) return null;

  const raw = typeof value === 'object'
    ? value.value || value.name || value.id || ''
    : value;

  const status = String(raw).trim();
  return allowedStatuses.has(status) ? status : null;
}

async function baserowRequest(path, options = {}) {
  const response = await fetch(`${baserowApiBase}${path}`, {
    ...options,
    headers: {
      Authorization: `Token ${baserowToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Baserow error ${response.status}: ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

async function supabasePatchBySignalHash(signalHash, operatorStatus) {
  const base = supabaseUrl.replace(/\/$/, '');
  const encodedHash = encodeURIComponent(signalHash);

  const response = await fetch(
    `${base}/rest/v1/market_signals?signal_hash=eq.${encodedHash}`,
    {
      method: 'PATCH',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        operator_status: operatorStatus,
        updated_at: new Date().toISOString(),
      }),
    }
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Supabase error ${response.status}: ${text}`);
  }
}

async function getBaserowRows() {
  const rows = [];
  let page = 1;

  while (true) {
    const data = await baserowRequest(
      `/api/database/rows/table/${tableId}/?user_field_names=true&size=200&page=${page}`
    );

    rows.push(...(data.results || []));

    if (!data.next) break;
    page += 1;
  }

  return rows;
}

async function main() {
  console.log('Reading Baserow market signal operator statuses...');

  const baserowRows = await getBaserowRows();
  console.log(`Baserow rows: ${baserowRows.length}`);

  let updated = 0;
  let skipped = 0;

  for (const row of baserowRows) {
    const signalHash = row['Signal Hash'];
    const operatorStatus = normalizeStatus(row['Статус оператора']);

    if (!signalHash || !operatorStatus) {
      skipped += 1;
      continue;
    }

    await supabasePatchBySignalHash(signalHash, operatorStatus);
    updated += 1;
    console.log(`Synced operator status: ${operatorStatus} <- ${signalHash}`);
  }

  console.log(`Done. Updated: ${updated}. Skipped: ${skipped}.`);
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
