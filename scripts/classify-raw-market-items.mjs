#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';

const SHOULD_WRITE = process.argv.includes('--write');
const MAX_ITEMS = Number(process.env.RAW_MARKET_CLASSIFY_LIMIT || 50);

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

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function detectLanguage(text, fallback) {
  if (fallback) return fallback;

  const value = normalizeText(text);

  const hasCyrillic = /[а-яёіїєґ]/i.test(value);
  const hasUkrainian = /[іїєґ]/i.test(value);
  const hasRussianMarkers = /(ищу|посоветуйте|нужен|русск|электрик|юрист|бухгалтер|маникюр)/i.test(value);
  const hasUkrainianMarkers = /(шукаю|порадьте|потрібен|україн|німецьк|манікюр|юрист|бухгалтер)/i.test(value);

  if (hasUkrainian && hasRussianMarkers) return 'mixed';
  if (hasUkrainian || hasUkrainianMarkers) return 'uk';
  if (hasCyrillic || hasRussianMarkers) return 'ru';

  return 'unknown';
}

function detectCity(text) {
  const value = normalizeText(text);

  const cities = [
    { value: 'Köln', aliases: ['köln', 'кёльн', 'кельн', 'koeln', 'cologne'] },
    { value: 'Bonn', aliases: ['bonn', 'бонн', 'бонне'] },
    { value: 'Düsseldorf', aliases: ['düsseldorf', 'дюссельдорф', 'dusseldorf', 'duesseldorf'] },
    { value: 'Essen', aliases: ['essen', 'эссен', 'ессен'] },
    { value: 'Dortmund', aliases: ['dortmund', 'дортмунд'] },
    { value: 'Duisburg', aliases: ['duisburg', 'дуйсбург', 'дюйсбург'] },
    { value: 'Bochum', aliases: ['bochum', 'бохум'] },
    { value: 'Wuppertal', aliases: ['wuppertal', 'вупперталь'] },
    { value: 'Aachen', aliases: ['aachen', 'ахен', 'аахен'] },
    { value: 'Berlin', aliases: ['berlin', 'берлин', 'берлін'] },
  ];

  for (const city of cities) {
    if (city.aliases.some((alias) => value.includes(alias))) {
      return city.value;
    }
  }

  return null;
}

function detectSignalType(text, raw) {
  const value = normalizeText(text);

  const demandMarkers = [
    'ищу',
    'шукаю',
    'посоветуйте',
    'порадьте',
    'порекомендуйте',
    'нужен',
    'нужна',
    'потрібен',
    'потрібна',
    'кто знает',
    'хто знає',
    'где найти',
    'де знайти',
  ];

  const supplyMarkers = [
    'услуги',
    'послуги',
    'помогаю',
    'допомагаю',
    'предлагаю',
    'принимаю',
    'запись',
    'запис',
    'репетитор',
    'электрик',
    'електрик',
    'юрист',
    'адвокат',
    'бухгалтер',
    'маникюр',
    'манікюр',
    'массаж',
    'масаж',
    'косметолог',
    'steuerberater',
    'anwalt',
  ];

  if (demandMarkers.some((marker) => value.includes(marker))) return 'demand';
  if (supplyMarkers.some((marker) => value.includes(marker))) return 'supply';

  if (['instagram', 'kleinanzeigen'].includes(raw.source_platform)) return 'supply';

  if (raw.intent_hint === 'demand' && value.includes('forum')) return 'demand';
  if (raw.intent_hint === 'mixed') return 'supply';

  return 'unknown';
}

function hasBadSource(raw) {
  const url = normalizeText(raw.source_url);
  const title = normalizeText(raw.source_title);

  const badDomains = [
    'finanzamt.nrw.de',
    'wikipedia.org',
    'google.',
  ];

  if (badDomains.some((domain) => url.includes(domain))) return true;

  const badTitleMarkers = [
    'finanzamt köln',
    'финанцамт',
    'официальный сайт',
  ];

  return badTitleMarkers.some((marker) => title.includes(marker));
}

function detectServiceKeywords(text, categorySlug, subcategory) {
  const value = normalizeText(text);
  const keywords = [];

  const candidates = [
    'электрик',
    'розетк',
    'проводк',
    'свет',
    'маникюр',
    'манікюр',
    'гель-лак',
    'юрист',
    'адвокат',
    'аренда',
    'бухгалтер',
    'finanzamt',
    'налоги',
    'steuer',
    'репетитор',
    'немецк',
    'німецьк',
    'deutsch',
    'массаж',
    'масаж',
    'косметолог',
    'документ',
    'перевод',
  ];

  for (const candidate of candidates) {
    if (value.includes(candidate)) keywords.push(candidate);
  }

  if (keywords.length > 0) return [...new Set(keywords)].slice(0, 8);

  return [subcategory, categorySlug].filter(Boolean);
}

function calculateConfidence(raw, signalType, city) {
  let score = 0.45;

  if (raw.category_hint) score += 0.15;
  if (raw.subcategory_hint) score += 0.15;
  if (signalType !== 'unknown') score += 0.15;
  if (city || raw.region) score += 0.05;
  if (raw.source_url) score += 0.05;

  if (hasBadSource(raw)) score -= 0.35;

  return Math.max(0.1, Math.min(0.99, Number(score.toFixed(2))));
}

function buildSignalHash(row) {
  const raw = [
    row.source_platform || '',
    row.source_type || '',
    row.source_url || '',
    row.signal_text || '',
    row.category_slug || '',
    row.subcategory_candidate || '',
    row.signal_type || '',
  ].join('|').toLowerCase().trim();

  return crypto.createHash('sha256').update(raw).digest('hex');
}

function classifyRawItem(raw) {
  const combinedText = [
    raw.source_title,
    raw.source_text,
    raw.search_query,
  ].filter(Boolean).join('\n');

  if (!raw.source_text || hasBadSource(raw)) {
    return {
      status: 'ignored',
      reason: 'Ignored as irrelevant or low-value source.',
      signal: null,
    };
  }

  const signalType = detectSignalType(combinedText, raw);
  const city = raw.city_candidate || detectCity(combinedText);
  const categorySlug = raw.category_hint || null;
  const subcategoryCandidate = raw.subcategory_hint || null;
  const confidence = calculateConfidence(raw, signalType, city);

  if (!categorySlug || !subcategoryCandidate || signalType === 'unknown' || confidence < 0.55) {
    return {
      status: 'review_needed',
      reason: `Low confidence classification. signal_type=${signalType}; confidence=${confidence}`,
      signal: null,
    };
  }

  const serviceKeywords = detectServiceKeywords(combinedText, categorySlug, subcategoryCandidate);

  const sourcePlatform = raw.source_platform || 'web';

  const signal = {
    signal_type: signalType,
    source_platform: sourcePlatform,
    source_url: raw.source_url || null,
    source_text: raw.source_text,
    signal_text: raw.source_text,

    country: raw.country || 'Germany',
    region: raw.region || null,
    city,

    language_detected: detectLanguage(combinedText, raw.language_hint),
    category_slug: categorySlug,
    subcategory_candidate: subcategoryCandidate,

    has_instagram: sourcePlatform === 'instagram',
    has_telegram: sourcePlatform === 'telegram',
    has_facebook: sourcePlatform === 'facebook',
    has_website: ['web', 'kleinanzeigen', 'threads'].includes(sourcePlatform),
    has_email: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(combinedText),
    has_phone: /(\+\d{1,3}[\s-]?)?(\(?\d{2,5}\)?[\s-]?)?\d{3,}[\s-]?\d{3,}/.test(combinedText),

    is_self_employed_signal: signalType === 'supply',
    is_business_offer: signalType === 'supply',

    confidence,
    confidence_score: Math.round(confidence * 100),
    priority_score: Math.round(confidence * 100),
    status: 'new',
    operator_status: 'new',
    notes: 'Created automatically from raw public search item',
    payload: {
      raw_market_item_id: raw.id,
      search_query: raw.search_query,
      source_title: raw.source_title,
      provider: raw.provider,
      provider_rank: raw.provider_rank,
      service_keywords: serviceKeywords,
    },
  };

  signal.signal_hash = buildSignalHash(signal);

  return {
    status: 'processed',
    reason: 'Classified into market_signals.',
    signal,
  };
}

async function getRawItems() {
  return supabaseRequest(
    `raw_market_items?status=eq.new&select=*&order=collected_at.asc&limit=${MAX_ITEMS}`
  );
}

async function findExistingMarketSignal(signalHash) {
  const rows = await supabaseRequest(
    `market_signals?select=id&signal_hash=eq.${encodeURIComponent(signalHash)}&limit=1`
  );

  return rows[0] || null;
}

async function insertMarketSignal(signal) {
  return supabaseRequest('market_signals', {
    method: 'POST',
    body: JSON.stringify(signal),
  });
}

async function updateRawItem(id, status, notes) {
  if (!SHOULD_WRITE) return [];

  return supabaseRequest(`raw_market_items?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status,
      notes,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  });
}

async function main() {
  console.log(SHOULD_WRITE ? 'Raw market classifier: WRITE' : 'Raw market classifier: DRY RUN');

  const rawItems = await getRawItems();
  console.log(`Raw items to classify: ${rawItems.length}`);

  let processed = 0;
  let inserted = 0;
  let duplicates = 0;
  let ignored = 0;
  let reviewNeeded = 0;

  for (const raw of rawItems) {
    const result = classifyRawItem(raw);

    if (result.status === 'ignored') {
      ignored += 1;
      console.log(`Ignored: ${raw.source_title || raw.source_url}`);
      await updateRawItem(raw.id, 'ignored', result.reason);
      continue;
    }

    if (result.status === 'review_needed') {
      reviewNeeded += 1;
      console.log(`Review needed: ${raw.source_title || raw.source_url}`);
      await updateRawItem(raw.id, 'review_needed', result.reason);
      continue;
    }

    processed += 1;

    const existing = await findExistingMarketSignal(result.signal.signal_hash);

    if (existing) {
      duplicates += 1;
      console.log(`Duplicate signal: ${raw.source_title || raw.source_url}`);
      await updateRawItem(raw.id, 'duplicate', `Duplicate market signal: ${existing.id}`);
      continue;
    }

    console.log(`Signal: ${result.signal.signal_type} / ${result.signal.category_slug} / ${result.signal.subcategory_candidate} / ${result.signal.city || result.signal.region || result.signal.country}`);

    if (SHOULD_WRITE) {
      const created = await insertMarketSignal(result.signal);
      inserted += created.length;
      await updateRawItem(raw.id, 'processed', `Created market signal: ${created[0]?.id || ''}`);
    }
  }

  console.log('\nRaw market classification summary:');
  console.log(JSON.stringify({
    processed,
    inserted,
    duplicates,
    ignored,
    reviewNeeded,
  }, null, 2));

  if (!SHOULD_WRITE) {
    console.log('\nDry run only. Add --write to insert market_signals and update raw_market_items.');
  }
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
