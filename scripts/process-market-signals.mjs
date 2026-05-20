import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  },
})

const DRY_RUN = process.argv.includes('--dry-run')

const SOURCE_TABLES = [
  'category_opportunities',
  'scout_prospects',
  'content_tasks',
]

function hashSignal(parts) {
  return crypto
    .createHash('sha256')
    .update(parts.filter(Boolean).join('|'))
    .digest('hex')
}

function textOf(row, keys) {
  return keys
    .map((key) => row?.[key])
    .filter(Boolean)
    .map(String)
    .join(' ')
    .trim()
}

function pickFirst(row, keys) {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== '') {
      return row[key]
    }
  }

  return null
}

function numberOf(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function scoreFrom(row, keys, fallback = 0) {
  return numberOf(pickFirst(row, keys), fallback)
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

function normalizeSlug(value) {
  if (!value) return null

  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
}

function detectLanguage(row) {
  return pickFirst(row, [
    'language_code',
    'language_detected',
    'lang',
    'language',
    'route_locale',
    'locale',
  ])
}

function detectCategory(row) {
  return normalizeSlug(
    pickFirst(row, [
      'category_slug',
      'slug',
      'category',
      'category_name',
      'target_category',
    ]),
  )
}

function detectCity(row) {
  return normalizeSlug(
    pickFirst(row, [
      'city_slug',
      'city',
      'location_city',
      'target_city',
    ]),
  )
}

function detectSourceId(row) {
  return String(
    pickFirst(row, [
      'id',
      'uuid',
      'external_id',
      'source_id',
    ]) || '',
  )
}

function scoreDemandSignal(row) {
  const baseScore = scoreFrom(row, [
    'priority_score',
    'opportunity_score',
    'ai_score',
    'score',
  ], 20)

  let score = baseScore

  score += Math.min(numberOf(row.search_volume), 20)
  score += Math.min(numberOf(row.mentions_count), 15)
  score += Math.min(numberOf(row.leads_count) * 5, 20)
  score += Math.min(numberOf(row.prospects_count) * 2, 15)
  score += Math.min(numberOf(row.demand_count) * 5, 20)
  score += Math.min(numberOf(row.supply_count) * 2, 10)
  score += Math.min(numberOf(row.unique_source_count) * 3, 15)

  const status = String(row.status || '').toLowerCase()
  const marketDensity = String(row.market_density || '').toLowerCase()
  const supplyDemandBalance = String(row.supply_demand_balance || '').toLowerCase()

  if (status.includes('new')) score += 3
  if (status.includes('hot')) score += 12
  if (marketDensity === 'high') score += 8
  if (marketDensity === 'medium') score += 4
  if (supplyDemandBalance.includes('undersupplied')) score += 12
  if (row.missing_supply === true) score += 12
  if (row.has_specialists === false) score += 12

  return clamp(Math.round(score), 0, 100)
}

function scoreSupplySignal(row) {
  const baseScore = scoreFrom(row, [
    'priority_score',
    'ai_score',
    'score',
  ], 15)

  let score = baseScore

  score += Math.min(numberOf(row.followers_count) / 100, 10)
  score += Math.min(numberOf(row.rating) * 3, 15)
  score += Math.min(numberOf(row.reviews_count), 10)

  const text = textOf(row, [
    'title',
    'name',
    'business_name',
    'service_summary',
    'bio',
    'description',
    'notes',
    'source_text',
    'source_url',
  ]).toLowerCase()

  if (text.includes('украин')) score += 5
  if (text.includes('україн')) score += 5
  if (text.includes('russisch') || text.includes('русск')) score += 5
  if (text.includes('deutsch') || text.includes('немец')) score += 3
  if (row.email || row.phone || row.instagram || row.telegram || row.website) score += 10
  if (Array.isArray(row.available_channels) && row.available_channels.length > 0) score += 5
  if (String(row.outreach_status || '') === 'not_contacted') score += 3

  return clamp(Math.round(score), 0, 100)
}

function scoreContentSignal(row) {
  const baseScore = scoreFrom(row, [
    'priority_score',
    'priority',
    'ai_score',
    'score',
  ], 10)

  let score = baseScore

  const text = textOf(row, [
    'title',
    'topic',
    'description',
    'notes',
    'keywords',
    'target_audience',
    'angle',
    'source_insight',
    'draft_text',
  ]).toLowerCase()

  if (text.includes('германи') || text.includes('deutschland')) score += 5
  if (text.includes('украин') || text.includes('україн')) score += 4
  if (text.includes('специалист') || text.includes('fach')) score += 4
  if (text.includes('threads') || text.includes('telegram') || text.includes('facebook')) score += 4
  if (row.status === 'draft_ready') score += 8
  if (row.draft_text) score += 6
  if (row.cta) score += 4

  return clamp(Math.round(score), 0, 100)
}

function buildCategoryOpportunitySignal(row) {
  const sourceId = detectSourceId(row)
  const categorySlug = detectCategory(row)
  const citySlug = detectCity(row)
  const languageCode = detectLanguage(row)

  const title =
    pickFirst(row, ['title', 'category_title', 'category_name']) ||
    `Category opportunity: ${categorySlug || 'unknown category'}`

  const priorityScore = scoreDemandSignal(row)

  return {
    signal_hash: hashSignal([
      'category_opportunity',
      sourceId,
      categorySlug,
      citySlug,
      languageCode,
      title,
    ]),
    signal_type: 'category_demand',
    source_table: 'category_opportunities',
    source_id: sourceId || null,
    title: String(title),
    summary: textOf(row, ['ai_summary', 'summary', 'description', 'notes']) || null,
    category_slug: categorySlug,
    city_slug: citySlug,
    language_code: languageCode,
    priority_score: priorityScore,
    confidence_score: clamp(50 + Math.round(priorityScore / 3), 50, 90),
    recommended_action:
      row.recommended_action ||
      (priorityScore >= 75
        ? 'Prioritize category landing page, outreach and Telegram/FB post'
        : priorityScore >= 50
          ? 'Add to content plan and monitor specialist supply'
          : 'Keep as weak signal'),
    payload: row,
    status: 'new',
  }
}

function buildScoutProspectSignal(row) {
  const sourceId = detectSourceId(row)
  const categorySlug = detectCategory(row)
  const citySlug = detectCity(row)
  const languageCode = detectLanguage(row)

  const name =
    pickFirst(row, ['name', 'business_name', 'full_name', 'title', 'display_name']) ||
    pickFirst(row, ['service_summary']) ||
    'Unnamed specialist prospect'

  const priorityScore = scoreSupplySignal(row)
  const aiConfidence = numberOf(row.ai_confidence)

  return {
    signal_hash: hashSignal([
      'scout_prospect',
      sourceId,
      categorySlug,
      citySlug,
      languageCode,
      name,
    ]),
    signal_type: 'specialist_supply',
    source_table: 'scout_prospects',
    source_id: sourceId || null,
    title: String(name),
    summary: textOf(row, ['ai_summary', 'service_summary', 'bio', 'description', 'notes', 'source_text', 'source_url']) || null,
    category_slug: categorySlug,
    city_slug: citySlug,
    language_code: languageCode,
    priority_score: priorityScore,
    confidence_score: aiConfidence > 0
      ? clamp(Math.round(aiConfidence * 100), 0, 100)
      : clamp(45 + Math.round(priorityScore / 3), 45, 85),
    recommended_action:
      priorityScore >= 70
        ? 'Add to outreach queue'
        : priorityScore >= 45
          ? 'Review manually before outreach'
          : 'Low priority prospect',
    payload: row,
    status: 'new',
  }
}

function buildContentTaskSignal(row) {
  const sourceId = detectSourceId(row)
  const categorySlug = detectCategory(row)
  const citySlug = detectCity(row)
  const languageCode = detectLanguage(row)

  const title =
    pickFirst(row, ['title', 'topic', 'headline']) ||
    'Untitled content opportunity'

  const priorityScore = scoreContentSignal(row)

  return {
    signal_hash: hashSignal([
      'content_task',
      sourceId,
      categorySlug,
      citySlug,
      languageCode,
      title,
    ]),
    signal_type: 'content_opportunity',
    source_table: 'content_tasks',
    source_id: sourceId || null,
    title: String(title),
    summary: textOf(row, ['source_insight', 'summary', 'description', 'notes', 'keywords', 'angle']) || null,
    category_slug: categorySlug,
    city_slug: citySlug,
    language_code: languageCode,
    priority_score: priorityScore,
    confidence_score: clamp(45 + Math.round(priorityScore / 4), 45, 80),
    recommended_action:
      priorityScore >= 65
        ? 'Prepare short post/thread and connect it to relevant category'
        : priorityScore >= 40
          ? 'Keep in editorial backlog'
          : 'Low priority content idea',
    payload: row,
    status: 'new',
  }
}

function buildSignalsForTable(tableName, rows) {
  if (tableName === 'category_opportunities') {
    return rows.map(buildCategoryOpportunitySignal)
  }

  if (tableName === 'scout_prospects') {
    return rows.map(buildScoutProspectSignal)
  }

  if (tableName === 'content_tasks') {
    return rows.map(buildContentTaskSignal)
  }

  return []
}

async function readRows(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(500)

  if (error) {
    console.warn(`Skipping ${tableName}: ${error.message}`)
    return []
  }

  return data || []
}

async function upsertSignals(signals) {
  if (signals.length === 0) return { count: 0 }

  if (DRY_RUN) {
    console.log(JSON.stringify(signals, null, 2))
    return { count: signals.length }
  }

  const { error } = await supabase
    .from('market_signals')
    .upsert(signals, {
      onConflict: 'signal_hash',
    })

  if (error) {
    throw error
  }

  return { count: signals.length }
}

async function main() {
  console.log('Processing market signals...')
  console.log(`Mode: ${DRY_RUN ? 'dry-run' : 'write'}`)

  let allSignals = []

  for (const tableName of SOURCE_TABLES) {
    const rows = await readRows(tableName)
    const signals = buildSignalsForTable(tableName, rows)

    console.log(`${tableName}: rows=${rows.length}, signals=${signals.length}`)

    allSignals = allSignals.concat(signals)
  }

  allSignals.sort((a, b) => b.priority_score - a.priority_score)

  const result = await upsertSignals(allSignals)

  console.log(`Done. Processed signals: ${result.count}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
