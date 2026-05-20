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

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnv();

const token = process.env.BASEROW_API_TOKEN;
const tableId = process.env.BASEROW_CONTENT_TASKS_TABLE_ID;
const apiBase = process.env.BASEROW_API_BASE || 'https://api.baserow.io';

if (!token) {
  console.error('Missing BASEROW_API_TOKEN');
  process.exit(1);
}

if (!tableId) {
  console.error('Missing BASEROW_CONTENT_TASKS_TABLE_ID');
  process.exit(1);
}

const response = await fetch(`${apiBase}/api/database/fields/table/${tableId}/`, {
  headers: {
    Authorization: `Token ${token}`,
  },
});

const text = await response.text();

if (!response.ok) {
  console.error(`Baserow error: ${response.status} ${response.statusText}`);
  console.error(text);
  process.exit(1);
}

const fields = JSON.parse(text);

console.log('Baserow connection OK');
console.log(`Content Tasks table ID: ${tableId}`);
console.log(`Fields found: ${fields.length}`);

for (const field of fields) {
  console.log(`- ${field.name} (${field.type})`);
}
