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
  let score = 20

  score += numberOf(row.priority_score) || 0
  score += Math.min(numberOf(row.search_volume), 40)
  score += Math.min(numberOf(row.mentions_count), 30)
  score += Math.min(numberOf(row.leads_count) * 10, 40)
  score += Math.min(numberOf(row.prospects_count) * 3, 30)

  const status = String(row.status || '').toLowerCase()

  if (status.includes('new')) score += 5
  if (status.includes('hot')) score += 20
  if (row.missing_supply === true) score += 20
  if (row.has_specialists === false) score += 20

  return clamp(Math.round(score), 0, 100)
}

function scoreSupplySignal(row) {
  let score = 15

  score += Math.min(numberOf(row.followers_count) / 100, 20)
  score += Math.min(numberOf(row.rating) * 5, 25)
  score += Math.min(numberOf(row.reviews_count), 25)

  const text = textOf(row, [
    'title',
    'name',
    'bio',
    'description',
    'notes',
    'source_url',
  ]).toLowerCase()

  if (text.includes('украин')) score += 10
  if (text.includes('україн')) score += 10
  if (text.includes('russisch') || text.includes('русск')) score += 10
  if (text.includes('deutsch') || text.includes('немец')) score += 5
  if (row.email || row.phone || row.instagram || row.telegram) score += 15

  return clamp(Math.round(score), 0, 100)
}

function scoreContentSignal(row) {
  let score = 10

  score += numberOf(row.priority_score) || 0

  const text = textOf(row, [
    'title',
    'topic',
    'description',
    'notes',
    'keywords',
  ]).toLowerCase()

  if (text.includes('германи') || text.includes('deutschland')) score += 15
  if (text.includes('украин') || text.includes('україн')) score += 10
  if (text.includes('специалист') || text.includes('fach')) score += 10
  if (text.includes('threads') || text.includes('telegram') || text.includes('facebook')) score += 10

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
    summary: textOf(row, ['summary', 'description', 'notes']) || null,
    category_slug: categorySlug,
    city_slug: citySlug,
    language_code: languageCode,
    priority_score: priorityScore,
    confidence_score: clamp(50 + Math.round(priorityScore / 3), 50, 90),
    recommended_action:
      priorityScore >= 75
        ? 'Prioritize category landing page, outreach and Telegram/FB post'
        : priorityScore >= 50
          ? 'Add to content plan and monitor specialist supply'
          : 'Keep as weak signal',
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
    pickFirst(row, ['name', 'full_name', 'title', 'display_name']) ||
    'Unnamed specialist prospect'

  const priorityScore = scoreSupplySignal(row)

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
    summary: textOf(row, ['bio', 'description', 'notes', 'source_url']) || null,
    category_slug: categorySlug,
    city_slug: citySlug,
    language_code: languageCode,
    priority_score: priorityScore,
    confidence_score: clamp(45 + Math.round(priorityScore / 3), 45, 85),
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
    summary: textOf(row, ['summary', 'description', 'notes', 'keywords']) || null,
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
