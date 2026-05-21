#!/usr/bin/env node

import crypto from 'node:crypto';
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

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY;
const googleSearchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const DRY_RUN = process.argv.includes('--dry-run');
const MAX_QUERIES = Number(process.env.OPEN_SERVICE_SCOUT_MAX_QUERIES || 40);
const RESULTS_PER_QUERY = Number(process.env.OPEN_SERVICE_SCOUT_RESULTS_PER_QUERY || 5);
const SOURCES_PATH = process.env.OPEN_SERVICE_SCOUT_SOURCES_PATH || 'config/open-service-scout-sources.json';

function requireEnv(name, value) {
  if (!value) {
    console.error(`Missing required env variable: ${name}`);
    process.exit(1);
  }
}

requireEnv('GOOGLE_SEARCH_API_KEY', googleApiKey);
requireEnv('GOOGLE_SEARCH_ENGINE_ID', googleSearchEngineId);
requireEnv('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL', supabaseUrl);
requireEnv('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY', supabaseKey);

const languageQueries = [
  'русскоязычные услуги Германия специалист',
  'украинские специалисты Германия услуги',
  'русский мастер Германия услуги',
  'український спеціаліст Німеччина послуги',
  'говорю по-русски услуги Германия специалист',
  'для украинцев в Германии услуги специалист',
  'russischsprachige Dienstleistungen Deutschland Spezialist',
  'ukrainische Spezialisten Deutschland Dienstleistungen',
  'russischsprachiger Dienstleister Deutschland',
  'ukrainischsprachiger Dienstleister Deutschland',
];

const serviceQueries = [
  'фотограф психолог бухгалтер адвокат ремонт Германия русский украинский',
  'мастер консультант коуч дизайнер репетитор Германия русский украинский',
  'Steuerberater Anwalt Psychologe Fotograf russisch ukrainisch Deutschland',
  'Handwerker Elektriker Kosmetik Nachhilfe russisch ukrainisch Deutschland',
];

const cityRules = [
  ['köln', 'Köln', 'NRW'], ['koln', 'Köln', 'NRW'], ['кёльн', 'Köln', 'NRW'], ['кельн', 'Köln', 'NRW'],
  ['düsseldorf', 'Düsseldorf', 'NRW'], ['duesseldorf', 'Düsseldorf', 'NRW'], ['дюссельдорф', 'Düsseldorf', 'NRW'],
  ['berlin', 'Berlin', 'Berlin'], ['берлин', 'Berlin', 'Berlin'],
  ['münchen', 'München', 'Bayern'], ['munich', 'München', 'Bayern'], ['мюнхен', 'München', 'Bayern'],
  ['hamburg', 'Hamburg', 'Hamburg'], ['гамбург', 'Hamburg', 'Hamburg'],
  ['dortmund', 'Dortmund', 'NRW'], ['essen', 'Essen', 'NRW'], ['bochum', 'Bochum', 'NRW'], ['wuppertal', 'Wuppertal', 'NRW'],
  ['bielefeld', 'Bielefeld', 'NRW'], ['bonn', 'Bonn', 'NRW'], ['frankfurt', 'Frankfurt am Main', 'Hessen'],
  ['stuttgart', 'Stuttgart', 'Baden-Württemberg'], ['hannover', 'Hannover', 'Niedersachsen'], ['leipzig', 'Leipzig', 'Sachsen'],
  ['bremen', 'Bremen', 'Bremen'], ['nrw', null, 'NRW'], ['nordrhein-westfalen', null, 'NRW'],
];

const categoryRules = [
  { category: 'photo-video', subcategory: 'photographer', keywords: ['фотограф', 'фотосесс', 'photograf', 'fotograf', 'photo shooting', 'фото'] },
  { category: 'health-psychology', subcategory: 'psychologist', keywords: ['психолог', 'психотерап', 'psycholog', 'psychotherapie', 'therapeut', 'терапевт'] },
  { category: 'taxes-finance', subcategory: 'tax-consultant', keywords: ['налог', 'steuer', 'steuerberater', 'buchhaltung', 'бухгалтер', 'finanz'] },
  { category: 'legal', subcategory: 'lawyer', keywords: ['адвокат', 'юрист', 'anwalt', 'rechtsanwalt', 'recht'] },
  { category: 'repair', subcategory: 'electrician', keywords: ['электрик', 'електрик', 'electrician', 'elektriker', 'розет', 'strom', 'licht'] },
  { category: 'repair', subcategory: 'renovation', keywords: ['ремонт', 'renovierung', 'handwerker', 'мастер', 'маляр', 'плитк', 'boden'] },
  { category: 'beauty', subcategory: 'beauty-master', keywords: ['маникюр', 'манікюр', 'ногти', 'nails', 'kosmetik', 'beauty', 'брови', 'ресницы'] },
  { category: 'education', subcategory: 'tutor', keywords: ['репетитор', 'tutor', 'nachhilfe', 'обучение', 'уроки', 'unterricht'] },
  { category: 'translation', subcategory: 'translator', keywords: ['переводчик', 'перекладач', 'übersetzer', 'dolmetscher', 'translation'] },
  { category: 'business-marketing', subcategory: 'designer', keywords: ['дизайнер', 'design', 'брендбук', 'логотип', 'webdesign', 'сайт', 'website'] },
  { category: 'coaching-consulting', subcategory: 'coach', keywords: ['коуч', 'coach', 'консультант', 'beratung', 'mentor', 'ментор'] },
];

const languageRules = [
  ['україн', 'ua'], ['украин', 'ua'], ['ukrainisch', 'ua'], ['ukrainian', 'ua'],
  ['русск', 'ru'], ['росій', 'ru'], ['russisch', 'ru'], ['russian', 'ru'], ['по-русски', 'ru'],
  ['deutsch', 'de'],
];

function hashSignal(parts) {
  return crypto.createHash('sha256').update(parts.filter(Boolean).join('|')).digest('hex');
}

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function stripPersonalContactText(value) {
  return String(value || '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email removed]')
    .replace(/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,5}\)?[\s.-]?){2,}\d{2,}/g, '[phone removed]')
    .trim();
}

function loadSources() {
  if (!fs.existsSync(SOURCES_PATH)) {
    throw new Error(`Missing source map: ${SOURCES_PATH}`);
  }

  return JSON.parse(fs.readFileSync(SOURCES_PATH, 'utf8'))
    .filter((source) => source.domain)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

function detectLanguage(text) {
  const lower = normalizeText(text);
  const hits = new Set();

  for (const [keyword, language] of languageRules) {
    if (lower.includes(keyword)) hits.add(language);
  }

  if (hits.has('ua') && hits.has('ru')) return 'ru_ua';
  if (hits.has('ua')) return 'ua';
  if (hits.has('ru')) return 'ru';
  if (hits.has('de')) return 'de';
  return null;
}

function detectLocation(text) {
  const lower = normalizeText(text);

  for (const [keyword, city, region] of cityRules) {
    if (lower.includes(keyword)) return { city, region };
  }

  return { city: null, region: null };
}

function detectCategory(text) {
  const lower = normalizeText(text);
  let best = null;
  let bestScore = 0;

  for (const rule of categoryRules) {
    const score = rule.keywords.reduce((total, keyword) => lower.includes(keyword) ? total + 1 : total, 0);
    if (score > bestScore) {
      best = rule;
      bestScore = score;
    }
  }

  return best
    ? { category: best.category, subcategory: best.subcategory, score: bestScore }
    : { category: 'unknown', subcategory: null, score: 0 };
}

function buildMarketCluster({ language, category, city, region }) {
  return [language || 'unknown-language', category || 'unknown-category', city || region || 'germany']
    .join('-')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9äöüß-]+/gi, '-');
}

function confidenceFor({ language, categoryScore, city, region, sourceTitle, sourceSnippet, sourcePriority }) {
  let score = 25;

  if (language) score += 25;
  if (categoryScore > 0) score += Math.min(categoryScore * 15, 30);
  if (city || region) score += 15;
  if (sourceTitle) score += 5;
  if (sourceSnippet) score += 5;
  score += Math.min(Math.round((sourcePriority || 0) / 20), 5);

  return Math.max(0, Math.min(100, score));
}

function buildKeywords(query, text) {
  const lower = normalizeText(`${query} ${text}`);
  const keywords = [];

  for (const [keyword] of languageRules) {
    if (lower.includes(keyword)) keywords.push(keyword);
  }

  for (const rule of categoryRules) {
    for (const keyword of rule.keywords) {
      if (lower.includes(keyword)) keywords.push(keyword);
    }
  }

  return [...new Set(keywords)].slice(0, 20);
}

function buildQueriesForSource(source) {
  const focus = new Set(source.focus || []);
  let queries = [...languageQueries];

  if (focus.has('local_services') || focus.has('classifieds')) queries.push(...serviceQueries);
  if (focus.has('psychology') || focus.has('therapy')) queries.push('психолог психотерапевт русскоязычный украинский Германия', 'Psychologe Therapeut russisch ukrainisch Deutschland');
  if (focus.has('tax') || focus.has('finance')) queries.push('бухгалтер налоговый консультант русский украинский Германия', 'Steuerberater russisch ukrainisch Deutschland');
  if (focus.has('legal') || focus.has('lawyer')) queries.push('адвокат юрист русский украинский Германия', 'Anwalt russisch ukrainisch Deutschland');
  if (focus.has('beauty')) queries.push('маникюр брови ресницы русский украинский Германия');
  if (focus.has('photo')) queries.push('фотограф русский украинский Германия');
  if (focus.has('education')) queries.push('репетитор русский украинский Германия');

  return [...new Set(queries)].map((query) => `${query} site:${source.domain}`);
}

function classifySearchResult(query, item, source) {
  const sourceTitle = stripPersonalContactText(item.title || '');
  const sourceSnippet = stripPersonalContactText(item.snippet || '');
  const sourceText = `${sourceTitle} ${sourceSnippet} ${query}`;
  const language = detectLanguage(sourceText);
  const location = detectLocation(sourceText);
  const category = detectCategory(sourceText);
  const confidence = confidenceFor({
    language,
    categoryScore: category.score,
    city: location.city,
    region: location.region,
    sourceTitle,
    sourceSnippet,
    sourcePriority: source.priority,
  });

  return {
    signal_hash: hashSignal(['open_service_signal', source.domain, item.link, sourceTitle, sourceSnippet]),
    source_platform: source.source_type || 'focused_source',
    source_url: item.link,
    source_title: sourceTitle,
    source_snippet: sourceSnippet,
    source_text_excerpt: sourceSnippet.slice(0, 500),
    country: 'Germany',
    region: location.region,
    city: location.city,
    language_detected: language,
    service_description: sourceTitle || sourceSnippet,
    category_guess: category.category,
    subcategory_guess: category.subcategory,
    signal_kind: 'supply',
    market_cluster: buildMarketCluster({ language, category: category.category, city: location.city, region: location.region }),
    confidence_score: confidence,
    ai_summary: `Open service signal from ${source.domain}: ${sourceTitle || sourceSnippet}`.slice(0, 500),
    source_keywords: buildKeywords(query, sourceText),
    status: confidence >= 60 ? 'new' : 'low_confidence',
  };
}

async function googleSearch(query) {
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', googleApiKey);
  url.searchParams.set('cx', googleSearchEngineId);
  url.searchParams.set('q', query);
  url.searchParams.set('num', String(Math.min(RESULTS_PER_QUERY, 10)));
  url.searchParams.set('gl', 'de');

  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) throw new Error(`Google Search error ${response.status}: ${text}`);

  const data = text ? JSON.parse(text) : {};
  return data.items || [];
}

async function supabaseUpsert(rows) {
  if (rows.length === 0) return { count: 0 };

  if (DRY_RUN) {
    console.log(JSON.stringify(rows, null, 2));
    return { count: rows.length };
  }

  const base = supabaseUrl.replace(/\/$/, '');
  const response = await fetch(`${base}/rest/v1/open_service_signals?on_conflict=signal_hash`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase error ${response.status}: ${text}`);

  return { count: rows.length };
}

async function main() {
  console.log('Running Open Service Scout...');
  console.log(`Mode: ${DRY_RUN ? 'dry-run' : 'write'}`);

  const sources = loadSources();
  const plannedQueries = [];

  for (const source of sources) {
    for (const query of buildQueriesForSource(source)) {
      plannedQueries.push({ source, query });
      if (plannedQueries.length >= MAX_QUERIES) break;
    }
    if (plannedQueries.length >= MAX_QUERIES) break;
  }

  console.log(`Sources loaded: ${sources.length}`);
  console.log(`Queries planned: ${plannedQueries.length}`);

  const signalsByHash = new Map();

  for (const { source, query } of plannedQueries) {
    console.log(`Searching [${source.domain}]: ${query}`);
    const items = await googleSearch(query);

    for (const item of items) {
      if (!item.link) continue;

      const signal = classifySearchResult(query, item, source);
      if (!signal.language_detected) continue;
      if (signal.category_guess === 'unknown' && signal.confidence_score < 65) continue;

      signalsByHash.set(signal.signal_hash, signal);
    }
  }

  const signals = [...signalsByHash.values()].sort((a, b) => b.confidence_score - a.confidence_score);
  const result = await supabaseUpsert(signals);

  console.log(`Done. Open service signals processed: ${result.count}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
