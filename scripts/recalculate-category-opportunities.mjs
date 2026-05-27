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
      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Supabase error ${response.status}: ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

function groupKey(parts) {
  return [
    parts.country || 'Germany',
    parts.region || '',
    parts.city || '',
    parts.category_slug || '',
    parts.subcategory_candidate || '',
  ].join('|').toLowerCase();
}

function getMarketDensity(total) {
  if (total >= 30) return 'very_high';
  if (total >= 12) return 'high';
  if (total >= 4) return 'medium';
  return 'low';
}

function getBalance(supplyCount, demandCount) {
  if (supplyCount === 0 && demandCount === 0) return 'insufficient_data';
  if (supplyCount > demandCount) return 'supply_higher';
  if (demandCount > supplyCount) return 'demand_higher';
  return 'balanced';
}

function getOpportunityScore(supplyCount, demandCount, uniqueSourceCount) {
  const total = supplyCount + demandCount;

  let score = 30;

  score += Math.min(total * 8, 30);
  score += Math.min(uniqueSourceCount * 5, 15);

  if (demandCount > supplyCount) score += 15;
  if (supplyCount > 0 && demandCount > 0) score += 10;

  return Math.max(0, Math.min(score, 100));
}

function buildRecommendedAction(group) {
  const { supply_count, demand_count, category_slug, subcategory_candidate, region, city } = group;
  const location = city || region || group.country || 'Germany';
  const category = subcategory_candidate || category_slug;

  if (demand_count > supply_count) {
    return `Спрос выше предложения: усилить поиск специалистов в категории ${category} для ${location}, параллельно делать клиентский контент.`;
  }

  if (supply_count > demand_count) {
    return `Предложение выше спроса: делать контент и SEO для привлечения заявок в категории ${category} для ${location}.`;
  }

  return `Спрос и предложение сбалансированы: продолжать собирать сигналы и тестировать контент в категории ${category} для ${location}.`;
}

function buildAiSummary(group) {
  const location = group.city || group.region || group.country || 'Germany';
  const category = group.subcategory_candidate || group.category_slug;

  return `Автоматический вывод Market Radar: ${category} / ${location}. Supply signals: ${group.supply_count}. Demand signals: ${group.demand_count}. Основные каналы: ${group.main_channels.join(', ') || 'нет данных'}.`;
}

function addToGroup(groups, signal, cityOverride) {
  if (!signal.category_slug) return;

  const city = cityOverride === undefined ? signal.city : cityOverride;

  const key = groupKey({
    country: signal.country,
    region: signal.region,
    city,
    category_slug: signal.category_slug,
    subcategory_candidate: signal.subcategory_candidate,
  });

  if (!groups.has(key)) {
    groups.set(key, {
      country: signal.country || 'Germany',
      region: signal.region || null,
      city: city || null,
      category_slug: signal.category_slug,
      subcategory_candidate: signal.subcategory_candidate || null,
      supply_count: 0,
      demand_count: 0,
      source_keys: new Set(),
      channels: new Set(),
    });
  }

  const group = groups.get(key);

  if (signal.signal_type === 'supply') group.supply_count += 1;
  if (signal.signal_type === 'demand') group.demand_count += 1;

  const sourceKey = signal.signal_hash || signal.id;
  if (sourceKey) group.source_keys.add(sourceKey);

  if (signal.source_platform) group.channels.add(signal.source_platform);
}

async function findExistingOpportunity(group) {
  const filters = [
    `country=eq.${encodeURIComponent(group.country)}`,
    group.region ? `region=eq.${encodeURIComponent(group.region)}` : 'region=is.null',
    group.city ? `city=eq.${encodeURIComponent(group.city)}` : 'city=is.null',
    `category_slug=eq.${encodeURIComponent(group.category_slug)}`,
    group.subcategory_candidate
      ? `subcategory_candidate=eq.${encodeURIComponent(group.subcategory_candidate)}`
      : 'subcategory_candidate=is.null',
    'select=id',
    'limit=1',
  ].join('&');

  const rows = await supabaseRequest(`category_opportunities?${filters}`);
  return rows[0] || null;
}

async function createOpportunity(payload) {
  return supabaseRequest('category_opportunities', {
    method: 'POST',
    headers: {
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  });
}

async function updateOpportunity(id, payload) {
  return supabaseRequest(`category_opportunities?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  });
}

function toPayload(group) {
  const total = group.supply_count + group.demand_count;
  const mainChannels = Array.from(group.channels);

  const payload = {
    country: group.country,
    region: group.region,
    city: group.city,
    category_slug: group.category_slug,
    subcategory_candidate: group.subcategory_candidate,

    supply_count: group.supply_count,
    demand_count: group.demand_count,
    unique_source_count: group.source_keys.size,

    main_channels: mainChannels,
    market_density: getMarketDensity(total),
    supply_demand_balance: getBalance(group.supply_count, group.demand_count),
    opportunity_score: getOpportunityScore(
      group.supply_count,
      group.demand_count,
      group.source_keys.size
    ),

    recommended_action: buildRecommendedAction({
      ...group,
      main_channels: mainChannels,
    }),

    ai_summary: buildAiSummary({
      ...group,
      main_channels: mainChannels,
    }),

    last_calculated_at: new Date().toISOString(),
  };

  return payload;
}

async function main() {
  console.log('Reading market signals...');

  const signals = await supabaseRequest(
    'market_signals?select=id,signal_hash,signal_type,country,region,city,category_slug,subcategory_candidate,source_platform&order=created_at.desc&limit=1000'
  );

  console.log(`Market signals found: ${signals.length}`);

  const groups = new Map();

  for (const signal of signals) {
    addToGroup(groups, signal);

    if (signal.region) {
      addToGroup(groups, signal, null);
    }
  }

  console.log(`Opportunity groups calculated: ${groups.size}`);

  let created = 0;
  let updated = 0;

  for (const group of groups.values()) {
    const payload = toPayload(group);
    const existing = await findExistingOpportunity(group);

    if (existing) {
      await updateOpportunity(existing.id, payload);
      updated += 1;
      console.log(`Updated: ${payload.category_slug}/${payload.subcategory_candidate || '-'} ${payload.region || '-'} ${payload.city || '-'}`);
    } else {
      await createOpportunity(payload);
      created += 1;
      console.log(`Created: ${payload.category_slug}/${payload.subcategory_candidate || '-'} ${payload.region || '-'} ${payload.city || '-'}`);
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
