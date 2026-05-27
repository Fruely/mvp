#!/usr/bin/env node

import fs from 'node:fs';

const INPUT_PATH = 'data/market-signals-input.json';

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

const input = readInput();
const classified = input.map(classifySignal);

console.log(JSON.stringify(classified, null, 2));
