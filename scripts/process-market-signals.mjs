#!/usr/bin/env node

import fs from 'node:fs';

const INPUT_PATH = 'data/market-signals-input.json';
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

function readInput() {
  if (!fs.existsSync(INPUT_PATH)) {
    console.error(`Input file not found: ${INPUT_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(INPUT_PATH, 'utf8');

  try {
    const data = JSON.parse(raw);

    if (!Array.isArray(data)) {
      throw new Error('Input JSON must be an array');
    }

    return data;
  } catch (error) {
    console.error(`Invalid JSON in ${INPUT_PATH}: ${error.message}`);
    process.exit(1);
  }
}

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function detectSignalType(text) {
  const demandMarkers = [
    'ищу',
    'шукаю',
    'нужен',
    'нужна',
    'нужно',
    'потрібен',
    'потрібна',
    'посоветуйте',
    'порадьте',
    'кто знает',
    'хто знає',
    'кто может',
    'хто може',
  ];

  const supplyMarkers = [
    'делаю',
    'роблю',
    'помогаю',
    'допомагаю',
    'принимаю',
    'приймаю',
    'услуги',
    'послуги',
    'мастер',
    'майстер',
    'запись',
    'запис',
    'работаю',
    'працюю',
  ];

  const hasDemand = demandMarkers.some((marker) => text.includes(marker));
  const hasSupply = supplyMarkers.some((marker) => text.includes(marker));

  if (hasDemand && !hasSupply) return 'demand';
  if (hasSupply && !hasDemand) return 'supply';

  if (hasDemand && hasSupply) return 'demand';

  return 'unknown';
}

function detectLanguage(text) {
  const uaMarkers = [
    'україн',
    'потріб',
    'шукаю',
    'порадьте',
    'майстер',
    'послуги',
    'допомагаю',
    'працюю',
  ];

  const ruMarkers = [
    'русск',
    'ищу',
    'нужен',
    'нужна',
    'посоветуйте',
    'мастер',
    'услуги',
    'помогаю',
    'работаю',
  ];

  const hasUa = uaMarkers.some((marker) => text.includes(marker));
  const hasRu = ruMarkers.some((marker) => text.includes(marker));

  if (hasUa && hasRu) return 'mixed';
  if (hasUa) return 'ua';
  if (hasRu) return 'ru';

  return 'unknown';
}

function detectCity(text) {
  const cities = [
    { slug: 'köln', value: 'Köln', aliases: ['köln', 'кёльн', 'кельн', 'koeln'] },
    { slug: 'düsseldorf', value: 'Düsseldorf', aliases: ['düsseldorf', 'дюссельдорф', 'dusseldorf', 'duesseldorf'] },
    { slug: 'berlin', value: 'Berlin', aliases: ['berlin', 'берлин', 'берлін'] },
    { slug: 'münchen', value: 'München', aliases: ['münchen', 'мюнхен', 'munich', 'muenchen'] },
    { slug: 'hamburg', value: 'Hamburg', aliases: ['hamburg', 'гамбург'] },
    { slug: 'frankfurt', value: 'Frankfurt', aliases: ['frankfurt', 'франкфурт'] },
  ];

  for (const city of cities) {
    if (city.aliases.some((alias) => text.includes(alias))) {
      return city.value;
    }
  }

  return null;
}

function detectCategory(text) {
  const rules = [
    {
      category_slug: 'repair',
      subcategory_candidate: 'electrician',
      keywords: ['электрик', 'електрик', 'розетк', 'проводк', 'свет', 'світло', 'кабель'],
    },
    {
      category_slug: 'repair',
      subcategory_candidate: 'plumber',
      keywords: ['сантехник', 'сантехнік', 'вода', 'трубы', 'труби', 'кран', 'ванн'],
    },
    {
      category_slug: 'beauty',
      subcategory_candidate: 'manicure',
      keywords: ['маникюр', 'манікюр', 'ногти', 'нігті', 'гель-лак', 'гель лак'],
    },
    {
      category_slug: 'psychology',
      subcategory_candidate: 'psychologist',
      keywords: ['психолог', 'терапия', 'терапія', 'тревог', 'адаптац'],
    },
    {
      category_slug: 'tutoring',
      subcategory_candidate: 'german_tutor',
      keywords: ['репетитор', 'немецк', 'німецьк', 'deutsch', 'уроки'],
    },
    {
      category_slug: 'photo-video',
      subcategory_candidate: 'photographer',
      keywords: ['фотограф', 'фото', 'съёмк', 'зйомк', 'портрет'],
    },
    {
      category_slug: 'documents-relocation',
      subcategory_candidate: 'documents_help',
      keywords: ['документ', 'jobcenter', 'внж', 'ausländerbehörde', 'термин', 'termin'],
    },
  ];

  for (const rule of rules) {
    const matchedKeywords = rule.keywords.filter((keyword) => text.includes(keyword));

    if (matchedKeywords.length > 0) {
      return {
        category_slug: rule.category_slug,
        subcategory_candidate: rule.subcategory_candidate,
        service_keywords: matchedKeywords,
      };
    }
  }

  return {
    category_slug: null,
    subcategory_candidate: null,
    service_keywords: [],
  };
}

function detectChannels(item, text) {
  const channels = new Set();

  if (item.source_platform) {
    channels.add(item.source_platform);
  }

  if (text.includes('telegram') || text.includes('телеграм')) channels.add('telegram');
  if (text.includes('instagram') || text.includes('инстаграм')) channels.add('instagram');
  if (text.includes('facebook') || text.includes('фейсбук')) channels.add('facebook');
  if (text.includes('whatsapp') || text.includes('ватсап')) channels.add('whatsapp');

  return Array.from(channels);
}

function calculateConfidence(result) {
  let score = 0.35;

  if (result.signal_type !== 'unknown') score += 0.15;
  if (result.category_slug) score += 0.15;
  if (result.subcategory_candidate) score += 0.1;
  if (result.city) score += 0.1;
  if (result.language_detected !== 'unknown') score += 0.1;
  if (result.source_platform) score += 0.05;

  return Math.min(Number(score.toFixed(2)), 0.99);
}

function classifySignal(item) {
  const text = normalizeText(item.source_text);

  const category = detectCategory(text);
  let signalType = detectSignalType(text);

  const sourceType = String(item.source_type || '').toLowerCase();
  const sourcePlatform = String(item.source_platform || '').toLowerCase();

  const looksLikeSpecialistProfile =
    category.category_slug &&
    (
      sourceType === 'profile_bio' ||
      sourceType === 'listing' ||
      sourceType === 'business_profile' ||
      sourcePlatform === 'instagram'
    );

  if (signalType === 'unknown' && looksLikeSpecialistProfile) {
    signalType = 'supply';
  }

  const result = {
    signal_type: signalType,
    source_platform: item.source_platform || null,
    source_type: item.source_type || null,
    source_url: item.source_url || '',
    source_text: item.source_text || '',
    signal_text: item.source_text || '',
    country: item.country || 'Germany',
    region: item.region || null,
    city: detectCity(text),
    language_detected: detectLanguage(text),
    category_slug: category.category_slug,
    subcategory_candidate: category.subcategory_candidate,
    service_keywords: category.service_keywords,
    available_channels: detectChannels(item, text),
  };

  result.confidence = calculateConfidence(result);

  return result;
}

function getSupabaseConfig() {
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

  return {
    supabaseUrl: supabaseUrl.replace(/\/$/, ''),
    supabaseKey,
  };
}

function toMarketSignalInsert(row) {
  const channels = new Set(row.available_channels || []);

  return {
    signal_type: row.signal_type,
    country: row.country || 'Germany',
    region: row.region || null,
    city: row.city || null,
    language_detected: row.language_detected || null,
    category_slug: row.category_slug || null,
    subcategory_candidate: row.subcategory_candidate || null,
    source_platform: row.source_platform || null,
    source_url: row.source_url || null,
    source_text: row.source_text || null,
    signal_text: row.signal_text || null,
    has_instagram: channels.has('instagram'),
    has_telegram: channels.has('telegram'),
    has_facebook: channels.has('facebook'),
    has_website: channels.has('website'),
    has_email: channels.has('email'),
    has_phone: channels.has('phone'),
    is_self_employed_signal: row.signal_type === 'supply',
    is_business_offer: row.signal_type === 'supply',
    confidence: row.confidence ?? null,
    notes: 'Inserted by local Market Signal Processor',
  };
}

async function insertMarketSignals(rows) {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();

  const validRows = rows.filter((row) => row.signal_type === 'supply' || row.signal_type === 'demand');

  if (validRows.length === 0) {
    console.log('No valid supply/demand signals to insert.');
    return [];
  }

  const payload = validRows.map(toMarketSignalInsert);

  const response = await fetch(`${supabaseUrl}/rest/v1/market_signals`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Supabase insert failed ${response.status}: ${text}`);
  }

  return text ? JSON.parse(text) : [];
}

const input = readInput();
const classified = input.map(classifySignal);

if (!SHOULD_WRITE) {
  console.log(JSON.stringify(classified, null, 2));
  console.log('\nDry run only. Add --write to insert into Supabase market_signals.');
} else {
  try {
    const inserted = await insertMarketSignals(classified);
    console.log(`Inserted market signals: ${inserted.length}`);
    console.log(JSON.stringify(inserted, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
