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
    const value = trimmed.slice(index + 1).trim();

    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const baserowToken = process.env.BASEROW_API_TOKEN;
const tableId = process.env.BASEROW_OPERATOR_DAILY_ACTIONS_TABLE_ID;
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
requireEnv('BASEROW_OPERATOR_DAILY_ACTIONS_TABLE_ID', tableId);
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

function mapRow(row) {
  return {
    Name: row['Name'] || row.id,
    'Supabase ID': row.id,
    'Тип действия': row['Тип действия'] || '',
    'Приоритет': row['Приоритет'] ?? null,
    'Краткий вывод': row['Краткий вывод'] || '',
    'Что сделать': row['Что сделать'] || '',
    'Почему важно': row['Почему важно'] || '',
    'Действие для лидогенерации': row['Действие для лидогенерации'] || '',
    'Рекомендуемый канал': row['Рекомендуемый канал'] || '',
    'Статус': row['Статус'] || '',
    'Источник': row['source_table'] || row.source_table || '',
    'Категория': row['Категория'] || '',
    'Подкатегория': row['Подкатегория'] || '',
    'Регион': row['Регион'] || '',
    'Город': row['Город'] || '',
  };
}

async function main() {
  console.log('Reading Supabase operator daily actions...');

  const supabaseRows = await supabaseGet(
    'growth_operator_daily_actions_view?select=*&order=Приоритет.desc,Обновлено.desc&limit=200'
  );

  console.log(`Supabase rows: ${supabaseRows.length}`);

  console.log('Reading Baserow operator daily actions...');
  const baserowRows = await getBaserowRows();

  const existingBySupabaseId = new Map();

  for (const row of baserowRows) {
    if (row['Supabase ID']) {
      existingBySupabaseId.set(row['Supabase ID'], row);
    }
  }

  let created = 0;
  let updated = 0;

  for (const supabaseRow of supabaseRows) {
    const mapped = mapRow(supabaseRow);
    const existing = existingBySupabaseId.get(supabaseRow.id);

    if (existing) {
      await updateBaserowRow(existing.id, mapped);
      updated += 1;
      console.log(`Updated: ${mapped.Name}`);
    } else {
      await createBaserowRow(mapped);
      created += 1;
      console.log(`Created: ${mapped.Name}`);
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
