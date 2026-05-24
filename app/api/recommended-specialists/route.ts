import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";
import { CACHE_PUBLIC_RECOMMENDED, jsonWithCache } from "@/lib/http/cache";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";

export const dynamic = "force-dynamic";

/**
 * Homepage recommended grid: 3 rows x 4 cards.
 *
 * Row 1: founder / first-50 rotation.
 * Row 2: premium placement rotation.
 * Row 3: mostly premium backfill + discovery slots for newer non-premium specialists.
 */
const FOUNDER_ROW_SIZE = 4;
const PREMIUM_ROW_SIZE = 4;
const DISCOVERY_ROW_SIZE = 4;
const DISCOVERY_NON_PREMIUM_SLOTS = 1;
const TOTAL_SLOTS = FOUNDER_ROW_SIZE + PREMIUM_ROW_SIZE + DISCOVERY_ROW_SIZE;
const POOL_FETCH_LIMIT = 160;

type PlacementGroup = "founder" | "premium" | "discovery" | "general";
type RecommendationBadge = "founder_first_50" | "premium_placement" | "new_discovery";

type SpecialistRow = {
  id: string;
  slug?: string | null;
  name?: string | null;
  avatar_url?: string | null;
  category_id?: string | null;
  languages?: string[] | null;
  status?: string | null;
  featured_priority?: number | null;
  is_featured?: boolean | null;
  founder_badge?: boolean | null;
  published_at?: string | null;
  created_at?: string | null;
  specialist_services?: unknown;
};

type SelectedSpecialist = SpecialistRow & {
  placement_group: PlacementGroup;
  badges: RecommendationBadge[];
};

/** Deterministic PRNG for seeded shuffle (stable within same seed). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

/** UTC calendar day mixed into a 32-bit seed. */
function utcDaySeed(d: Date): number {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return (y * 10000 + m * 100 + day) >>> 0;
}

/** UTC 12-hour window index (stable within ~12h). */
function utcHalfDaySeed(d: Date): number {
  return Math.floor(d.getTime() / (12 * 60 * 60 * 1000)) >>> 0;
}

function isPremiumPlacement(row: SpecialistRow): boolean {
  return row.is_featured === true || row.status === "featured_verified";
}

function normalizePrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim().replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function hasDisplayableServicePrice(priceFrom: number | null, priceComment: string | null): boolean {
  if (priceFrom == null || !Number.isFinite(priceFrom) || priceFrom < 0) return false;
  if (priceFrom > 0) return true;
  return priceFrom === 0 && Boolean(priceComment);
}

function hasValidServiceForRecommended(services: unknown): boolean {
  if (!Array.isArray(services) || services.length === 0) return false;
  return services.some((s) => {
    const row = s as { title?: unknown; price_from?: unknown; price_comment?: unknown; is_active?: unknown };
    const title = normalizeText(row.title);
    if (!title) return false;
    if (row.is_active !== true) return false;
    const priceFrom = normalizePrice(row.price_from);
    const priceComment = normalizeText(row.price_comment);
    return hasDisplayableServicePrice(priceFrom, priceComment);
  });
}

function dedupeRows(rows: SpecialistRow[]): SpecialistRow[] {
  const byId = new Map<string, SpecialistRow>();
  for (const row of rows) {
    if (!row?.id || !hasValidServiceForRecommended(row.specialist_services)) continue;
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
  return Array.from(byId.values());
}

function takeUniqueById(
  ordered: SpecialistRow[],
  used: Set<string>,
  n: number,
  placementGroup: PlacementGroup,
  badgesForRow: (row: SpecialistRow) => RecommendationBadge[],
): SelectedSpecialist[] {
  const out: SelectedSpecialist[] = [];
  for (const row of ordered) {
    if (out.length >= n) break;
    if (!row?.id || used.has(row.id)) continue;
    used.add(row.id);
    out.push({ ...row, placement_group: placementGroup, badges: badgesForRow(row) });
  }
  return out;
}

function founderBadges(row: SpecialistRow): RecommendationBadge[] {
  const badges: RecommendationBadge[] = [];
  if (row.founder_badge === true) badges.push("founder_first_50");
  if (isPremiumPlacement(row)) badges.push("premium_placement");
  return badges;
}

function premiumBadges(row: SpecialistRow): RecommendationBadge[] {
  const badges: RecommendationBadge[] = [];
  if (row.founder_badge === true) badges.push("founder_first_50");
  badges.push("premium_placement");
  return badges;
}

function discoveryBadges(row: SpecialistRow): RecommendationBadge[] {
  const badges: RecommendationBadge[] = [];
  if (row.founder_badge === true) badges.push("founder_first_50");
  if (isPremiumPlacement(row)) badges.push("premium_placement");
  if (!isPremiumPlacement(row) && row.founder_badge !== true) badges.push("new_discovery");
  return badges;
}

function premiumSort(a: SpecialistRow, b: SpecialistRow): number {
  const ap = typeof a.featured_priority === "number" ? a.featured_priority : 0;
  const bp = typeof b.featured_priority === "number" ? b.featured_priority : 0;
  if (bp !== ap) return bp - ap;
  const at = a.published_at ? Date.parse(a.published_at) : 0;
  const bt = b.published_at ? Date.parse(b.published_at) : 0;
  return bt - at;
}

function visibleQuery(supabase: ReturnType<typeof createSupabaseServerClient>) {
  return supabase
    .from("specialists")
    .select(
      "id, slug, name, avatar_url, category_id, languages, status, featured_priority, is_featured, founder_badge, published_at, created_at, specialist_services!inner(id, title, price_from, price_comment, is_active)"
    )
    .in("status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
    .eq("is_active", true)
    .eq("is_visible", true)
    .or("is_test.is.null,is_test.eq.false")
    .eq("specialist_services.is_active", true)
    .not("specialist_services.title", "eq", "")
    .or("price_from.gt.0,and(price_from.eq.0,price_comment.not.is.null)", {
      foreignTable: "specialist_services",
    });
}

export async function GET() {
  const supabase = createSupabaseServerClient();
  const now = new Date();
  const seedDay = utcDaySeed(now);
  const seedHalfDay = utcHalfDaySeed(now);

  const [founderResult, premiumResult, discoveryResult] = await Promise.all([
    visibleQuery(supabase)
      .eq("founder_badge", true)
      .order("founder_assigned_at", { ascending: true, nullsFirst: false })
      .limit(POOL_FETCH_LIMIT),
    visibleQuery(supabase)
      .or("is_featured.eq.true,status.eq.featured_verified")
      .order("featured_priority", { ascending: false, nullsFirst: false })
      .order("featured_at", { ascending: false, nullsFirst: false })
      .limit(POOL_FETCH_LIMIT),
    visibleQuery(supabase)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(POOL_FETCH_LIMIT),
  ]);

  const firstError = founderResult.error ?? premiumResult.error ?? discoveryResult.error;
  if (firstError) {
    return jsonNoStore({ error: firstError.message }, { status: 500 });
  }

  const founderPool = dedupeRows((founderResult.data ?? []) as SpecialistRow[]);
  const premiumPool = dedupeRows((premiumResult.data ?? []) as SpecialistRow[]).sort(premiumSort);
  const discoveryPool = dedupeRows((discoveryResult.data ?? []) as SpecialistRow[]);
  const allById = new Map<string, SpecialistRow>();
  for (const row of [...founderPool, ...premiumPool, ...discoveryPool]) {
    if (!allById.has(row.id)) allById.set(row.id, row);
  }
  const base = Array.from(allById.values());
  if (base.length === 0) return jsonWithCache({ data: [] }, CACHE_PUBLIC_RECOMMENDED);

  const used = new Set<string>();

  const founderOrdered = seededShuffle(founderPool, seedDay ^ 0x4f4e4445);
  let founderPick = takeUniqueById(
    founderOrdered,
    used,
    FOUNDER_ROW_SIZE,
    "founder",
    founderBadges,
  );

  if (founderPick.length < FOUNDER_ROW_SIZE) {
    const backfill = base.filter((s) => !used.has(s.id) && s.founder_badge !== true);
    const extra = takeUniqueById(
      seededShuffle(backfill, seedDay ^ 0x424b46),
      used,
      FOUNDER_ROW_SIZE - founderPick.length,
      "general",
      discoveryBadges,
    );
    founderPick = [...founderPick, ...extra];
  }

  const premiumOrdered = seededShuffle(premiumPool, seedDay ^ 0x464554).sort(premiumSort);
  let premiumPick = takeUniqueById(
    premiumOrdered,
    used,
    PREMIUM_ROW_SIZE,
    "premium",
    premiumBadges,
  );

  if (premiumPick.length < PREMIUM_ROW_SIZE) {
    const backfill = base.filter((s) => !used.has(s.id));
    const extra = takeUniqueById(
      seededShuffle(backfill, seedDay ^ 0x46425f32),
      used,
      PREMIUM_ROW_SIZE - premiumPick.length,
      "general",
      discoveryBadges,
    );
    premiumPick = [...premiumPick, ...extra];
  }

  const premiumDiscoverySlots = Math.max(0, DISCOVERY_ROW_SIZE - DISCOVERY_NON_PREMIUM_SLOTS);
  let discoveryPick = takeUniqueById(
    seededShuffle(premiumPool.filter((s) => !used.has(s.id)), seedHalfDay ^ 0x50524d),
    used,
    premiumDiscoverySlots,
    "premium",
    premiumBadges,
  );

  const nonPremiumDiscovery = discoveryPool.filter(
    (s) => !used.has(s.id) && s.founder_badge !== true && !isPremiumPlacement(s),
  );
  const discoveryExtra = takeUniqueById(
    seededShuffle(nonPremiumDiscovery, seedHalfDay ^ 0x44495343),
    used,
    DISCOVERY_ROW_SIZE - discoveryPick.length,
    "discovery",
    discoveryBadges,
  );
  discoveryPick = [...discoveryPick, ...discoveryExtra];

  if (discoveryPick.length < DISCOVERY_ROW_SIZE) {
    const loose = base.filter((s) => !used.has(s.id));
    const extra = takeUniqueById(
      seededShuffle(loose, seedHalfDay ^ 0x474c32),
      used,
      DISCOVERY_ROW_SIZE - discoveryPick.length,
      "general",
      discoveryBadges,
    );
    discoveryPick = [...discoveryPick, ...extra];
  }

  const toShow: SelectedSpecialist[] = [
    ...founderPick,
    ...premiumPick,
    ...discoveryPick,
  ];

  if (toShow.length < TOTAL_SLOTS) {
    const rest = base.filter((s) => !used.has(s.id));
    const fill = takeUniqueById(
      seededShuffle(rest, seedHalfDay ^ 0x464c4c),
      used,
      TOTAL_SLOTS - toShow.length,
      "general",
      discoveryBadges,
    );
    toShow.push(...fill);
  }

  const specialistIds = toShow.map((r) => r.id);
  const { data: profiles } = await supabase
    .from("specialist_profiles")
    .select("specialist_id, city, photo_url, about_me")
    .in("specialist_id", specialistIds);

  const profileBySpecialistId = new Map<string, { city: string | null; photo_url: string | null; about_me: string | null }>();
  for (const p of profiles ?? []) {
    if (p?.specialist_id) {
      profileBySpecialistId.set(p.specialist_id, {
        city: typeof p.city === "string" ? p.city : null,
        photo_url: typeof p.photo_url === "string" ? p.photo_url : null,
        about_me: typeof p.about_me === "string" ? p.about_me : null,
      });
    }
  }

  const categoryIds = Array.from(
    new Set(
      toShow
        .map((row) => (typeof row.category_id === "string" ? row.category_id : null))
        .filter((id): id is string => Boolean(id))
    )
  );

  let categoryById = new Map<
    string,
    {
      title: string | null;
      title_ru: string | null;
      title_de: string | null;
      title_ua: string | null;
      slug: string | null;
    }
  >();
  if (categoryIds.length > 0) {
    const { data: categories } = await supabase
      .from("categories")
      .select("id, title, title_ru, title_de, title_ua, slug")
      .in("id", categoryIds);
    categoryById = new Map(
      (categories ?? []).map((category) => [
        String(category.id),
        {
          title: typeof category.title === "string" ? category.title : null,
          title_ru: typeof category.title_ru === "string" ? category.title_ru : null,
          title_de: typeof category.title_de === "string" ? category.title_de : null,
          title_ua: typeof category.title_ua === "string" ? category.title_ua : null,
          slug: typeof category.slug === "string" ? category.slug : null,
        },
      ])
    );
  }

  const { data: ratingRows } = await supabase
    .from("specialist_rating_stats")
    .select("specialist_id, rating_avg, reviews_count")
    .in("specialist_id", specialistIds);

  const ratingBySpecialistId = new Map<string, { rating_avg: number | null; reviews_count: number }>();
  for (const r of ratingRows ?? []) {
    if (typeof r?.specialist_id === "string") {
      ratingBySpecialistId.set(r.specialist_id, {
        rating_avg: typeof r.rating_avg === "number" ? r.rating_avg : null,
        reviews_count: typeof r.reviews_count === "number" ? r.reviews_count : 0,
      });
    }
  }

  const data = toShow.map((row, index) => {
    const profile = profileBySpecialistId.get(row.id);
    const category =
      typeof row.category_id === "string" ? categoryById.get(row.category_id) : undefined;
    const premiumPlacement = isPremiumPlacement(row) || row.placement_group === "premium";
    return {
      id: row.id,
      slug: row.slug ?? null,
      name: row.name != null && String(row.name).trim() ? String(row.name).trim() : null,
      avatar_url: row.avatar_url ?? profile?.photo_url ?? null,
      city: profile?.city ?? null,
      languages: Array.isArray(row.languages) ? row.languages : [],
      category_title: category?.title ?? null,
      category_title_ru: category?.title_ru ?? null,
      category_title_de: category?.title_de ?? null,
      category_title_ua: category?.title_ua ?? null,
      category_slug: category?.slug ?? null,
      about_line: profile?.about_me ?? null,
      featured_priority: row.featured_priority ?? 0,
      is_featured: premiumPlacement,
      rating_avg: ratingBySpecialistId.get(row.id)?.rating_avg ?? null,
      reviews_count: ratingBySpecialistId.get(row.id)?.reviews_count ?? 0,
      founder_badge: row.founder_badge === true,
      placement_group: row.placement_group,
      recommendation_row: Math.floor(index / 4) + 1,
      badges: row.badges,
    };
  });

  return jsonWithCache({ data }, CACHE_PUBLIC_RECOMMENDED);
}
