import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";

export const dynamic = "force-dynamic";

/** Homepage grid: 4 founder + 4 featured + 4 general */
const QUOTA_FOUNDER = 4;
const QUOTA_FEATURED = 4;
const QUOTA_GENERAL = 4;
const TOTAL_SLOTS = QUOTA_FOUNDER + QUOTA_FEATURED + QUOTA_GENERAL;
const FETCH_LIMIT = 120;

type SpecialistRow = {
  id: string;
  slug?: string | null;
  name?: string | null;
  avatar_url?: string | null;
  category_id?: string | null;
  languages?: string[] | null;
  featured_priority?: number | null;
  is_featured?: boolean | null;
  founder_badge?: boolean | null;
  specialist_services?: unknown;
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

function hasValidServiceForRecommended(services: unknown): boolean {
  if (!Array.isArray(services) || services.length === 0) return false;
  return services.some((s) => {
    const row = s as { title?: unknown; price_from?: unknown; is_active?: unknown };
    const title = typeof row.title === "string" ? row.title.trim() : "";
    if (!title) return false;
    if (row.is_active !== true) return false;
    const p = row.price_from;
    const n =
      typeof p === "number" && Number.isFinite(p)
        ? p
        : typeof p === "string" && p.trim()
          ? Number(p.trim().replace(/\s/g, "").replace(",", "."))
          : NaN;
    return Number.isFinite(n) && n > 0;
  });
}

function takeUniqueById(
  ordered: SpecialistRow[],
  used: Set<string>,
  n: number
): SpecialistRow[] {
  const out: SpecialistRow[] = [];
  for (const row of ordered) {
    if (out.length >= n) break;
    if (!row?.id || used.has(row.id)) continue;
    used.add(row.id);
    out.push(row);
  }
  return out;
}

export async function GET() {
  const supabase = createSupabaseServerClient();
  const now = new Date();
  const seedDay = utcDaySeed(now);
  const seedHalfDay = utcHalfDaySeed(now);

  const { data: specRows, error: specError } = await supabase
    .from("specialists")
    .select(
      "id, slug, name, avatar_url, category_id, languages, featured_priority, is_featured, founder_badge, specialist_services!inner(id, title, price_from, is_active)"
    )
    .in("status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
    .eq("is_active", true)
    .eq("is_visible", true)
    .eq("is_verified", true)
    .eq("specialist_services.is_active", true)
    .gt("specialist_services.price_from", 0)
    .not("specialist_services.title", "eq", "")
    .order("created_at", { ascending: false })
    .limit(FETCH_LIMIT);

  if (specError) {
    return jsonNoStore({ error: specError.message }, { status: 500 });
  }

  const byId = new Map<string, SpecialistRow>();
  for (const row of specRows ?? []) {
    const r = row as SpecialistRow;
    if (!r?.id || !hasValidServiceForRecommended(r.specialist_services)) continue;
    if (!byId.has(r.id)) byId.set(r.id, r);
  }
  const base = Array.from(byId.values());
  if (base.length === 0) return jsonNoStore({ data: [] });

  const used = new Set<string>();

  const founderPool = base.filter((s) => s.founder_badge === true);
  const founderOrdered = seededShuffle(founderPool, seedDay ^ 0x4f4e4445);
  let founderPick = takeUniqueById(founderOrdered, used, QUOTA_FOUNDER);

  if (founderPick.length < QUOTA_FOUNDER) {
    const backfill = base.filter((s) => !used.has(s.id) && s.founder_badge !== true);
    const extra = takeUniqueById(
      seededShuffle(backfill, seedDay ^ 0x424b46),
      used,
      QUOTA_FOUNDER - founderPick.length
    );
    founderPick = [...founderPick, ...extra];
  }

  const featuredPool = base.filter((s) => s.is_featured === true);
  const featuredOrdered = seededShuffle(featuredPool, seedDay ^ 0x464554);
  let featuredPick = takeUniqueById(featuredOrdered, used, QUOTA_FEATURED);

  if (featuredPick.length < QUOTA_FEATURED) {
    const backfill = base.filter((s) => !used.has(s.id));
    const extra = takeUniqueById(
      seededShuffle(backfill, seedDay ^ 0x46425f32),
      used,
      QUOTA_FEATURED - featuredPick.length
    );
    featuredPick = [...featuredPick, ...extra];
  }

  const generalStrict = base.filter(
    (s) =>
      !used.has(s.id) &&
      s.founder_badge !== true &&
      s.is_featured !== true
  );
  const generalOrdered = seededShuffle(generalStrict, seedHalfDay ^ 0x474e4c);
  let generalPick = takeUniqueById(generalOrdered, used, QUOTA_GENERAL);

  if (generalPick.length < QUOTA_GENERAL) {
    const loose = base.filter((s) => !used.has(s.id));
    const extra = takeUniqueById(
      seededShuffle(loose, seedHalfDay ^ 0x474c32),
      used,
      QUOTA_GENERAL - generalPick.length
    );
    generalPick = [...generalPick, ...extra];
  }

  const toShow: SpecialistRow[] = [
    ...founderPick,
    ...featuredPick,
    ...generalPick,
  ];

  if (toShow.length < TOTAL_SLOTS) {
    const rest = base.filter((s) => !used.has(s.id));
    const fill = takeUniqueById(
      seededShuffle(rest, seedHalfDay ^ 0x464c4c),
      used,
      TOTAL_SLOTS - toShow.length
    );
    toShow.push(...fill);
  }

  const specialistIds = toShow.map((r) => r.id);
  const { data: profiles } = await supabase
    .from("specialist_profiles")
    .select("specialist_id, city, photo_url")
    .in("specialist_id", specialistIds);

  const profileBySpecialistId = new Map<string, { city: string | null; photo_url: string | null }>();
  for (const p of profiles ?? []) {
    if (p?.specialist_id) {
      profileBySpecialistId.set(p.specialist_id, {
        city: typeof p.city === "string" ? p.city : null,
        photo_url: typeof p.photo_url === "string" ? p.photo_url : null,
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

  const data = toShow.map((row) => {
    const profile = profileBySpecialistId.get(row.id);
    const category =
      typeof row.category_id === "string" ? categoryById.get(row.category_id) : undefined;
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
      featured_priority: row.featured_priority ?? 0,
      rating_avg: ratingBySpecialistId.get(row.id)?.rating_avg ?? null,
      reviews_count: ratingBySpecialistId.get(row.id)?.reviews_count ?? 0,
      founder_badge: row.founder_badge === true,
    };
  });

  return jsonNoStore({ data });
}
