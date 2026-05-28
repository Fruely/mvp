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

const baserowToken = process.env.BASEROW_API_TOKEN;
const baserowApiBase = process.env.BASEROW_API_BASE || 'https://api.baserow.io';

if (!baserowToken) {
  console.error('Missing required env variable: BASEROW_API_TOKEN');
  process.exit(1);
}

const tables = [
  ['Content Tasks', process.env.BASEROW_CONTENT_TASKS_TABLE_ID],
  ['Category Opportunities', process.env.BASEROW_CATEGORY_OPPORTUNITIES_TABLE_ID],
  ['Scout Prospects', process.env.BASEROW_SCOUT_PROSPECTS_TABLE_ID],
  ['Market Signals', process.env.BASEROW_MARKET_SIGNALS_TABLE_ID],

  ['Operator Category Opportunities', process.env.BASEROW_OPERATOR_CATEGORY_OPPORTUNITIES_TABLE_ID],
  ['Operator Content Tasks', process.env.BASEROW_OPERATOR_CONTENT_TASKS_TABLE_ID],
  ['Operator Scout Prospects', process.env.BASEROW_OPERATOR_SCOUT_PROSPECTS_TABLE_ID],
  ['Operator Daily Actions', process.env.BASEROW_OPERATOR_DAILY_ACTIONS_TABLE_ID],
].filter(([, tableId]) => Boolean(tableId));

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

async function getRows(tableId) {
  let rows = [];
  let next = `/api/database/rows/table/${tableId}/?user_field_names=true&size=200`;

  while (next) {
    const data = await baserowRequest(next);
    rows = rows.concat(data.results || []);

    if (!data.next) break;

    const url = new URL(data.next);
    next = `${url.pathname}${url.search}`;
  }

  return rows;
}

async function deleteRow(tableId, rowId) {
  if (!SHOULD_WRITE) return;

  await baserowRequest(`/api/database/rows/table/${tableId}/${rowId}/`, {
    method: 'DELETE',
  });
}

async function main() {
  console.log(SHOULD_WRITE ? 'Baserow cleanup mode: WRITE' : 'Baserow cleanup mode: DRY RUN');

  if (tables.length === 0) {
    console.log('No Baserow Growth table IDs found in .env.local.');
    return;
  }

  for (const [name, tableId] of tables) {
    const rows = await getRows(tableId);
    console.log(`${name}: rows found ${rows.length}`);

    if (SHOULD_WRITE) {
      for (const row of rows) {
        await deleteRow(tableId, row.id);
      }

      console.log(`${name}: deleted ${rows.length}`);
    }
  }

  if (!SHOULD_WRITE) {
    console.log('\nDry run only. Add --write to delete rows from Baserow Growth/Operator tables.');
  } else {
    console.log('\nBaserow Growth/Operator rows cleanup completed.');
  }
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
