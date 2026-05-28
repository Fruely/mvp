#!/usr/bin/env node

import fs from 'node:fs';

const SHOULD_WRITE = process.argv.includes('--write');
const MAX_SIGNALS = Number(process.env.GROWTH_ACTIONS_SIGNAL_LIMIT || 500);

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

function labelService(signal) {
  const slug = signal.subcategory_candidate || signal.category_slug || 'услугу';

  const labels = {
    accountant: 'бухгалтера',
    german_tutor: 'репетитора немецкого',
    lawyer: 'юриста',
    manicure: 'мастера маникюра',
    electrician: 'электрика',
    renovation: 'мастера по ремонту',
    documents_help: 'помощь с документами',
    massage: 'массажиста',
    brows_lashes: 'мастера по бровям и ресницам',
  };

  return labels[slug] || slug;
}

function getLocation(signal) {
  return signal.city || signal.region || signal.country || 'Germany';
}

function getAudience(signal) {
  if (signal.language_detected === 'uk') {
    return 'Украиноязычные жители, которым нужна услуга';
  }

  if (signal.language_detected === 'mixed') {
    return 'Русскоязычные и украиноязычные жители, которым нужна услуга';
  }

  return 'Русскоязычные жители, которым нужна услуга';
}

function buildContentTask(signal) {
  const service = labelService(signal);
  const location = getLocation(signal);
  const isSupply = signal.signal_type === 'supply';

  return {
    source_signal_id: signal.id,
    content_goal: isSupply ? 'attract_specialists' : 'attract_clients',
    channel: 'threads',
    content_type: 'thread',

    country: signal.country || 'Germany',
    region: signal.region || null,
    city: signal.city || null,
    category_slug: signal.category_slug || null,
    subcategory_candidate: signal.subcategory_candidate || null,

    target_audience: getAudience(signal),
    topic: isSupply
      ? `Почему специалисту “${service}” в ${location} стоит быть видимым не только в чатах`
      : `Как найти ${service} в ${location} и не искать по десяткам чатов`,

    angle: isSupply
      ? 'Показать специалисту, что Freuly может быть дополнительным каналом видимости и заявок.'
      : 'Показать клиенту, что Freuly может быть спокойнее и понятнее, чем хаотичный поиск в чатах.',

    source_insight: `Контент создан автоматически из market signal: ${String(signal.signal_text || signal.source_text || '').slice(0, 400)}`,

    draft_text: isSupply
      ? [
          `Вы специалист в направлении ${service} в ${location}?`,
          '',
          'Клиенты часто ищут услуги через чаты, рекомендации и случайные комментарии.',
          '',
          'Freuly помогает специалисту быть видимым там, где человеку нужна конкретная услуга, город и понятный язык общения.',
          '',
          'Профиль специалиста может работать как спокойная точка входа для будущих заявок.',
        ].join('\n')
      : [
          `Ищете ${service} в ${location}?`,
          '',
          'Обычно поиск начинается с десятков сообщений в чатах: “посоветуйте кого-нибудь”, “кто свободен?”, “кто говорит по-русски или по-украински?”.',
          '',
          'На Freuly идея проще: человек описывает задачу, город и язык, а специалист получает понятную заявку.',
          '',
          'Это помогает искать не вслепую, а по конкретной услуге, локации и языку.',
        ].join('\n'),

    cta: isSupply
      ? 'Создайте профиль на Freuly, чтобы вас могли найти клиенты.'
      : 'Оставьте заявку на Freuly — специалист сможет откликнуться.',

    priority: isSupply ? 65 : 75,
    status: 'draft_ready',
    notes: 'Created automatically from market_signals by Growth Actions Generator',
  };
}

function getAvailableChannels(signal) {
  const channels = [];

  if (signal.has_instagram) channels.push('instagram');
  if (signal.has_telegram) channels.push('telegram');
  if (signal.has_facebook) channels.push('facebook');
  if (signal.has_website) channels.push('website');
  if (signal.has_email) channels.push('email');
  if (signal.has_phone) channels.push('phone');

  if (channels.length === 0 && signal.source_platform) {
    channels.push(signal.source_platform);
  }

  return [...new Set(channels)];
}

function getPreferredContactChannel(signal) {
  if (signal.has_instagram) return 'instagram';
  if (signal.has_telegram) return 'telegram';
  if (signal.has_facebook) return 'facebook';
  if (signal.has_website) return 'website';
  if (signal.has_email) return 'email';
  if (signal.has_phone) return 'phone';
  return signal.source_platform || 'manual_review';
}

function buildScoutProspect(signal) {
  const preferred = getPreferredContactChannel(signal);
  const duplicateKey = `market_signal:${signal.id}`;

  return {
    source_platform: signal.source_platform || 'web',
    source_url: signal.source_url || null,
    service_summary: signal.signal_text || signal.source_text || '',

    country: signal.country || 'Germany',
    region: signal.region || null,
    city: signal.city || null,
    language_detected: signal.language_detected || null,
    category_slug: signal.category_slug || null,
    subcategory_candidate: signal.subcategory_candidate || null,

    available_channels: getAvailableChannels(signal),
    preferred_contact_channel: preferred,
    contact_risk_level: preferred === 'website' || preferred === 'email' ? 'low' : 'medium',
    contact_channel_reason: `Preferred channel inferred from public market signal source: ${preferred}`,

    ai_summary: `Потенциальный специалист в сегменте ${labelService(signal)} / ${getLocation(signal)}.`,
    ai_score: Math.round(Number(signal.confidence || 0.6) * 100),

    duplicate_key: duplicateKey,
    status: 'new',
    outreach_status: 'not_contacted',
    notes: 'Created automatically from supply market_signals by Growth Actions Generator',
  };
}

async function getMarketSignals() {
  return supabaseRequest(
    `market_signals?select=*&order=created_at.asc&limit=${MAX_SIGNALS}`
  );
}

async function hasContentTaskForSignal(signalId) {
  const rows = await supabaseRequest(
    `content_tasks?select=id&source_signal_id=eq.${encodeURIComponent(signalId)}&limit=1`
  );

  return rows.length > 0;
}

async function hasScoutProspectForSignal(signalId) {
  const duplicateKey = `market_signal:${signalId}`;

  const rows = await supabaseRequest(
    `scout_prospects?select=id&duplicate_key=eq.${encodeURIComponent(duplicateKey)}&limit=1`
  );

  return rows.length > 0;
}

async function insertContentTask(row) {
  if (!SHOULD_WRITE) return [];
  return supabaseRequest('content_tasks', {
    method: 'POST',
    body: JSON.stringify(row),
  });
}

async function insertScoutProspect(row) {
  if (!SHOULD_WRITE) return [];
  return supabaseRequest('scout_prospects', {
    method: 'POST',
    body: JSON.stringify(row),
  });
}

async function main() {
  console.log(SHOULD_WRITE ? 'Growth actions generator: WRITE' : 'Growth actions generator: DRY RUN');

  const signals = await getMarketSignals();
  console.log(`Market signals found: ${signals.length}`);

  let contentCreated = 0;
  let contentSkipped = 0;
  let scoutCreated = 0;
  let scoutSkipped = 0;

  for (const signal of signals) {
    if (!signal.category_slug || !signal.subcategory_candidate) continue;

    if (['demand', 'supply'].includes(signal.signal_type)) {
      const exists = await hasContentTaskForSignal(signal.id);

      if (exists) {
        contentSkipped += 1;
      } else {
        const row = buildContentTask(signal);
        console.log(`Content task: ${signal.signal_type} / ${signal.category_slug} / ${signal.subcategory_candidate} / ${getLocation(signal)}`);
        const created = await insertContentTask(row);
        contentCreated += SHOULD_WRITE ? created.length : 1;
      }
    }

    if (signal.signal_type === 'supply') {
      const exists = await hasScoutProspectForSignal(signal.id);

      if (exists) {
        scoutSkipped += 1;
      } else {
        const row = buildScoutProspect(signal);
        console.log(`Scout prospect: ${signal.category_slug} / ${signal.subcategory_candidate} / ${getLocation(signal)}`);
        const created = await insertScoutProspect(row);
        scoutCreated += SHOULD_WRITE ? created.length : 1;
      }
    }
  }

  console.log('\nGrowth actions summary:');
  console.log(JSON.stringify({
    contentCreated,
    contentSkipped,
    scoutCreated,
    scoutSkipped,
  }, null, 2));

  if (!SHOULD_WRITE) {
    console.log('\nDry run only. Add --write to insert content_tasks and scout_prospects.');
  }
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
