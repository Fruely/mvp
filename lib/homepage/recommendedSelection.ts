/**
 * Pure selection helpers for homepage recommended specialists.
 * Deterministic seeded rotation + category diversity for the visible quartet.
 */

export type RecommendedSpecialistCandidate = {
  id: string;
  category_id?: string | null;
  founder_badge?: boolean | null;
  is_featured?: boolean | null;
  status?: string | null;
  featured_priority?: number | null;
  published_at?: string | null;
};

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function utcDaySeed(d: Date): number {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return (y * 10000 + m * 100 + day) >>> 0;
}

export function utcHalfDaySeed(d: Date): number {
  return Math.floor(d.getTime() / (12 * 60 * 60 * 1000)) >>> 0;
}

export function isPremiumPlacement(row: RecommendedSpecialistCandidate): boolean {
  return row.is_featured === true || row.status === "featured_verified";
}

export function premiumSort<T extends RecommendedSpecialistCandidate>(a: T, b: T): number {
  const ap = typeof a.featured_priority === "number" ? a.featured_priority : 0;
  const bp = typeof b.featured_priority === "number" ? b.featured_priority : 0;
  if (bp !== ap) return bp - ap;
  const at = a.published_at ? Date.parse(a.published_at) : 0;
  const bt = b.published_at ? Date.parse(b.published_at) : 0;
  return bt - at;
}

/** Preserve first occurrence order while deduping by specialist id. */
export function dedupeByIdPreserveOrder<T extends { id: string }>(rows: T[]): T[] {
  const byId = new Map<string, T>();
  for (const row of rows) {
    if (!row?.id || byId.has(row.id)) continue;
    byId.set(row.id, row);
  }
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    if (!row?.id || seen.has(row.id)) continue;
    seen.add(row.id);
    const canonical = byId.get(row.id);
    if (canonical) out.push(canonical);
  }
  return out;
}

/**
 * Priority-ordered eligible pool: founders → premium → discovery.
 * Used as the diversity selection input while preserving billing/plan tiers.
 */
export function buildPrioritizedOrderedPool<T extends RecommendedSpecialistCandidate>(
  founderPool: T[],
  premiumPool: T[],
  discoveryPool: T[],
  seedDay: number,
  seedHalfDay: number,
): T[] {
  const nonPremiumDiscovery = discoveryPool.filter(
    (row) => row.founder_badge !== true && !isPremiumPlacement(row),
  );

  const segments = [
    seededShuffle(founderPool, seedDay ^ 0x4f4e4445),
    seededShuffle(premiumPool, seedDay ^ 0x464554).sort(premiumSort),
    seededShuffle(nonPremiumDiscovery, seedHalfDay ^ 0x44495343),
    seededShuffle(discoveryPool, seedHalfDay ^ 0x474c32),
  ];

  return dedupeByIdPreserveOrder(segments.flat());
}

function categoryKey(row: RecommendedSpecialistCandidate): string | null {
  if (typeof row.category_id === "string" && row.category_id.trim()) {
    return row.category_id.trim();
  }
  return null;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function priorityTier(row: RecommendedSpecialistCandidate): number {
  if (row.founder_badge === true) return 0;
  if (isPremiumPlacement(row)) return 1;
  return 2;
}

/** Rotate representatives within a category without breaking cross-category priority tiers. */
function shuffleWithinCategoryRuns<T extends RecommendedSpecialistCandidate>(
  ordered: T[],
  seed: number,
): T[] {
  const result: T[] = [];
  let index = 0;

  while (index < ordered.length) {
    const row = ordered[index];
    const category = categoryKey(row) ?? `__id__:${row.id}`;
    let end = index + 1;
    while (end < ordered.length) {
      const nextCategory = categoryKey(ordered[end]) ?? `__id__:${ordered[end].id}`;
      if (nextCategory !== category) break;
      end += 1;
    }

    const categoryRun = ordered.slice(index, end);
    let tierIndex = 0;
    while (tierIndex < categoryRun.length) {
      const tier = priorityTier(categoryRun[tierIndex]);
      let tierEnd = tierIndex + 1;
      while (tierEnd < categoryRun.length && priorityTier(categoryRun[tierEnd]) === tier) {
        tierEnd += 1;
      }

      const tierRun = categoryRun.slice(tierIndex, tierEnd);
      result.push(
        ...(tierRun.length > 1
          ? seededShuffle(tierRun, seed ^ hashString(`${category}:${tier}`))
          : tierRun),
      );
      tierIndex = tierEnd;
    }

    index = end;
  }

  return result;
}

/**
 * Diversity-first deterministic pick:
 * 1) at most one specialist per category_id
 * 2) fill remaining slots from the seeded priority pool
 * 3) seeded final card order (not alphabetical)
 */
export function selectCategoryDiverseSpecialists<T extends RecommendedSpecialistCandidate>(
  orderedPool: T[],
  seed: number,
  limit = 4,
): T[] {
  if (limit <= 0 || orderedPool.length === 0) return [];

  const rotationPool = shuffleWithinCategoryRuns(orderedPool, seed ^ 0x504f4f4c);
  const selected: T[] = [];
  const usedIds = new Set<string>();
  const usedCategories = new Set<string>();

  for (const row of rotationPool) {
    if (selected.length >= limit) break;
    if (!row?.id || usedIds.has(row.id)) continue;
    const category = categoryKey(row);
    if (!category || usedCategories.has(category)) continue;
    selected.push(row);
    usedIds.add(row.id);
    usedCategories.add(category);
  }

  for (const row of rotationPool) {
    if (selected.length >= limit) break;
    if (!row?.id || usedIds.has(row.id)) continue;
    selected.push(row);
    usedIds.add(row.id);
  }

  if (selected.length <= 1) return selected;
  return seededShuffle(selected, seed ^ 0x4f5244);
}
