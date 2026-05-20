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

async function supabaseGet(path) {
  const base = supabaseUrl.replace(/\/$/, '');

  const response = await fetch(`${base}/rest/v1/${path}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Supabase error ${response.status}: ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

async function getBaserowRows() {
  const data = await baserowRequest(
    `/api/database/rows/table/${tableId}/?user_field_names=true&size=200`
  );

  return data.results || [];
}

async function createBaserowRow(row) {
  return baserowRequest(
    `/api/database/rows/table/${tableId}/?user_field_names=true`,
    {
      method: 'POST',
      body: JSON.stringify(row),
    }
  );
}

async function updateBaserowRow(rowId, row) {
  return baserowRequest(
    `/api/database/rows/table/${tableId}/${rowId}/?user_field_names=true`,
    {
      method: 'PATCH',
      body: JSON.stringify(row),
    }
  );
}

function clean(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function mapSignalType(signalType) {
  if (signalType === 'content_opportunity') return 'Контент';
  if (signalType === 'category_demand') return 'Спрос / категория';
  if (signalType === 'specialist_supply') return 'Специалист / supply';
  return clean(signalType);
}

function mapRow(row) {
  const title = row.title || row.signal_hash || row.id;

  return {
    "Ім'я": title,
    'Signal Hash': row.signal_hash || '',
    'Supabase ID': row.id,
    'Тип сигнала': mapSignalType(row.signal_type),
    'Signal Type Raw': row.signal_type || '',
    'Название': title,
    'Краткое описание': row.summary || '',
    'Категория': row.category_slug || '',
    'Город': row.city_slug || row.city || '',
    'Язык': row.language_code || row.language_detected || '',
    'Приоритет': row.priority_score ?? null,
    'Уверенность': row.confidence_score ?? null,
    'Рекомендованное действие': row.recommended_action || '',
    'Источник': row.source_table || '',
    'Source ID': row.source_id || '',
    'Статус': row.status || '',
    'Создано': row.created_at || '',
    'Обновлено': row.updated_at || '',
  };
}

async function main() {
  console.log('Reading Supabase market signals...');

  const supabaseRows = await supabaseGet(
    'market_signals?select=id,signal_hash,signal_type,title,summary,category_slug,city_slug,city,language_code,language_detected,priority_score,confidence_score,recommended_action,source_table,source_id,status,created_at,updated_at&signal_hash=not.is.null&order=priority_score.desc&limit=100'
  );

  console.log(`Supabase rows: ${supabaseRows.length}`);

  console.log('Reading Baserow market signals...');
  const baserowRows = await getBaserowRows();

  const existingBySignalHash = new Map();
  const existingBySupabaseId = new Map();

  for (const row of baserowRows) {
    if (row['Signal Hash']) {
      existingBySignalHash.set(row['Signal Hash'], row);
    }

    if (row['Supabase ID']) {
      existingBySupabaseId.set(row['Supabase ID'], row);
    }
  }

  let created = 0;
  let updated = 0;

  for (const supabaseRow of supabaseRows) {
    const mapped = mapRow(supabaseRow);
    const existing =
      existingBySignalHash.get(supabaseRow.signal_hash) ||
      existingBySupabaseId.get(supabaseRow.id);

    if (existing) {
      await updateBaserowRow(existing.id, mapped);
      updated += 1;
      console.log(`Updated: ${supabaseRow.signal_hash}`);
    } else {
      await createBaserowRow(mapped);
      created += 1;
      console.log(`Created: ${supabaseRow.signal_hash}`);
    }
  }

  console.log(`Done. Created: ${created}. Updated: ${updated}.`);
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
