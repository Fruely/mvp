#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

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

const steps = [
  {
    name: 'Process market signals',
    command: 'node',
    args: ['scripts/process-market-signals.mjs', '--write'],
  },
  {
    name: 'Recalculate category opportunities',
    command: 'node',
    args: ['scripts/recalculate-category-opportunities.mjs'],
  },
  {
    name: 'Sync Growth System to Baserow',
    command: 'node',
    args: ['scripts/sync-baserow-growth-all.mjs'],
  },
];

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseKey);
}

async function supabaseGet(path) {
  if (!hasSupabaseConfig()) {
    return [];
  }

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
    throw new Error(`Supabase summary query failed ${response.status}: ${text}`);
  }

  return text ? JSON.parse(text) : [];
}

async function countRows(path) {
  const rows = await supabaseGet(`${path}&select=id&limit=10000`);
  return rows.length;
}

async function printOperatorSummary() {
  if (!hasSupabaseConfig()) {
    console.log('\nOperator summary skipped: Supabase env variables are missing.');
    return;
  }

  try {
    const [
      marketSignalsCount,
      categoryOpportunitiesCount,
      contentTasksCount,
      draftReadyContentTasksCount,
      scoutProspectsCount,
      newScoutProspectsCount,
    ] = await Promise.all([
      countRows('market_signals?'),
      countRows('category_opportunities?'),
      countRows('content_tasks?'),
      countRows('content_tasks?status=eq.draft_ready'),
      countRows('scout_prospects?'),
      countRows('scout_prospects?status=eq.new&outreach_status=eq.not_contacted'),
    ]);

    console.log('\n=== Operator summary ===');
    console.log(`Market signals total: ${marketSignalsCount}`);
    console.log(`Category opportunities total: ${categoryOpportunitiesCount}`);
    console.log(`Content tasks total: ${contentTasksCount}`);
    console.log(`Content tasks ready to publish: ${draftReadyContentTasksCount}`);
    console.log(`Scout prospects total: ${scoutProspectsCount}`);
    console.log(`New scout prospects not contacted: ${newScoutProspectsCount}`);

    console.log('\nOpen in Baserow:');
    console.log('1. Operator Category Opportunities — decide where to focus.');
    console.log('2. Operator Content Tasks — publish the highest-priority ready tasks.');
    console.log('3. Operator Scout Prospects — check new specialists and contact manually.');
  } catch (error) {
    console.error(`\nOperator summary failed: ${error.message}`);
  }
}

for (const step of steps) {
  console.log(`\n=== ${step.name} ===`);

  const result = spawnSync(step.command, step.args, {
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    console.error(`\nPipeline failed on step: ${step.name}`);
    process.exit(result.status || 1);
  }
}

console.log('\nMarket Radar pipeline completed successfully.');

await printOperatorSummary();
