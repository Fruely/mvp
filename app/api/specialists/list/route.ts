import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { jsonNoStore } from "@/lib/api/response";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";

// Force dynamic so Next.js does not attempt to prerender this API route
export const dynamic = 'force-dynamic';

type WorkFormat = 'online' | 'offline' | 'hybrid';
type SortMode = 'relevance' | 'new' | 'experience';

type SpecialistRow = {
  id: string;
  slug?: string | null;
  name: string | null;
  bio: string | null;
  avatar_url: string | null;
  category_id: string | null;
  languages: string[] | null;
  work_format?: WorkFormat | null;
  approved_at?: string | null;
  created_at?: string | null;
  lat?: number | null;
  lng?: number | null;
  mobile_service?: boolean | null;
  service_radius_km?: number | null;
};

type ProfileRow = {
  specialist_id: string;
  photo_url: string | null;
  city?: string | null;
  about_me?: string | null;
  services?: string | null;
  experience?: string | null;
};

type ServicePricingType = 'fixed' | 'range' | 'hourly';
type ServiceRow = {
  specialist_id: string;
  pricing_type: ServicePricingType | null;
  price_from: number | null;
  price_to: number | null;
  currency: string | null;
  price_comment?: string | null;
};
type ServiceWithSpecialistRow = {
  specialist_id: string | null;
  specialists: SpecialistRow | SpecialistRow[] | null;
};

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function normalizeSlug(value: string, id: string): string {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base || `specialist-${id.slice(0, 8)}`;
}

function pickAboutLine(args: {
  profileAbout?: string | null;
  profileServices?: string | null;
  specialistBio?: string | null;
  categoryTitle?: string | null;
}): string | null {
  const values = [
    args.profileAbout,
    args.profileServices,
    args.specialistBio,
    args.categoryTitle,
  ];
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function parseExperienceYears(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(/(\d{1,2})/);
  if (!match) return null;
  const years = Number.parseInt(match[1], 10);
  return Number.isFinite(years) ? years : null;
}

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

function parseOptionalCoord(value: string | null): number | null {
  if (value == null || !String(value).trim()) return null;
  const n = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function toSpecialistCoord(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.trim().replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseServicePriceFromRow(rawPf: unknown): number | null {
  if (typeof rawPf === "number" && Number.isFinite(rawPf)) return rawPf;
  if (typeof rawPf === "string" && rawPf.trim()) {
    const n = Number(rawPf.trim().replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

type SpecialistServiceListMeta = {
  min_price_from: number;
  min_price_to: number | null;
  min_pricing_type: ServicePricingType;
  min_currency: string;
  active_services_count: number;
  price_comment: string | null;
};

/** Prefer minimum of prices &gt; 0; use first price=0 row (and its comment) only when no positive prices exist. */
function aggregateSpecialistServicesForList(rows: ServiceRow[]): SpecialistServiceListMeta | null {
  type Parsed = {
    priceFrom: number;
    pricingType: ServicePricingType;
    currency: string;
    priceTo: number | null;
    rowComment: string | null;
  };

  const parsed: Parsed[] = [];
  for (const row of rows) {
    const priceFromParsed = parseServicePriceFromRow(row.price_from);
    if (priceFromParsed === null || priceFromParsed < 0) continue;

    const pricingType: ServicePricingType =
      row.pricing_type === "range" || row.pricing_type === "hourly" || row.pricing_type === "fixed"
        ? row.pricing_type
        : "fixed";
    const currency =
      typeof row.currency === "string" && row.currency.trim() ? row.currency.trim() : "EUR";
    const nextPriceTo =
      typeof row.price_to === "number" && Number.isFinite(row.price_to) ? row.price_to : null;
    const rowComment =
      row.price_comment != null && String(row.price_comment).trim()
        ? String(row.price_comment).trim().slice(0, 120)
        : null;

    parsed.push({
      priceFrom: priceFromParsed,
      pricingType,
      currency,
      priceTo: nextPriceTo,
      rowComment,
    });
  }

  if (parsed.length === 0) return null;

  const realPrices = parsed.filter((p) => p.priceFrom > 0);
  const zeroPrices = parsed.filter((p) => p.priceFrom === 0);

  const chosen =
    realPrices.length > 0
      ? realPrices.reduce((best, p) => (p.priceFrom < best.priceFrom ? p : best))
      : zeroPrices[0];

  return {
    min_price_from: chosen.priceFrom,
    min_price_to: chosen.priceTo,
    min_pricing_type: chosen.pricingType,
    min_currency: chosen.currency,
    active_services_count: parsed.length,
    price_comment: chosen.rowComment,
  };
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const categoryIdParam = searchParams.get('category_id') || searchParams.get('categoryId');
    const categorySlug = searchParams.get('category')?.trim().toLowerCase() ?? '';
    const limit = Math.min(parsePositiveInt(searchParams.get('limit'), 12), 50);
    const offset = parsePositiveInt(searchParams.get('offset'), 0);
    const language = searchParams.get('language')?.trim().toLowerCase() ?? '';
    const city = searchParams.get('city')?.trim().toLowerCase() ?? '';
    const sort = (searchParams.get('sort') as SortMode | null) ?? 'relevance';
    const debugEnabled = searchParams.get("debug") === "1";

    const userLat =
      parseOptionalCoord(searchParams.get("user_lat")) ??
      parseOptionalCoord(searchParams.get("lat"));
    const userLng =
      parseOptionalCoord(searchParams.get("user_lng")) ??
      parseOptionalCoord(searchParams.get("lng"));

    const _trace: Record<string, unknown> = {};

    const supabase = createSupabaseServerClient();

    let categoryId = categoryIdParam;
    if (!categoryId && categorySlug) {
      const { data: categoryRow, error: categoryError } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .maybeSingle();
      if (categoryError) {
        return jsonNoStore(
          { error: 'Failed to resolve category' },
          { status: 500 }
        );
      }
      categoryId = categoryRow?.id ?? null;
    }

    if (!categoryId) {
      return jsonNoStore(
        { error: 'category_id parameter is required' },
        { status: 400 }
      );
    }

    const fullSelect =
      'specialist_id,specialists!inner(id,slug,name,bio,avatar_url,category_id,languages,work_format,approved_at,created_at,lat,lng,mobile_service,service_radius_km)';
    const safeSelect =
      'specialist_id,specialists!inner(id,slug,name,bio,avatar_url,category_id,languages,work_format,approved_at,created_at)';
    const fallbackSelect =
      'specialist_id,specialists!inner(id,slug,name,bio,avatar_url,category_id,languages,created_at)';

    let rows: SpecialistRow[] | null = null;
    let queryError: { message?: string } | null = null;

    const extractRows = (data: unknown): SpecialistRow[] =>
      ((data as ServiceWithSpecialistRow[] | null) ?? [])
        .map((row) =>
          Array.isArray(row.specialists) ? row.specialists[0] ?? null : row.specialists
        )
        .filter((row): row is SpecialistRow => Boolean(row));

    const initial = await supabase
      .from("specialist_services")
      .select(fullSelect)
      .eq("category_id", categoryId)
      .eq("is_active", true)
      .gte("price_from", 0)
      .in("specialists.status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
      .eq("specialists.is_active", true)
      .eq("specialists.is_visible", true);

    rows = extractRows(initial.data);
    queryError = initial.error;
    _trace.q1_fullSelect = { rows: rows.length, error: queryError?.message ?? null };
    console.log("[specialists/list] primary query:", _trace.q1_fullSelect);

    if (queryError) {
      const safe = await supabase
        .from("specialist_services")
        .select(safeSelect)
        .eq("category_id", categoryId)
        .eq("is_active", true)
        .gte("price_from", 0)
        .in("specialists.status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
        .eq("specialists.is_active", true)
        .eq("specialists.is_visible", true);

      rows = extractRows(safe.data);
      queryError = safe.error;
      _trace.q2_safeSelect = { rows: rows.length, error: queryError?.message ?? null };
      console.log("[specialists/list] safeSelect:", _trace.q2_safeSelect);

      if (queryError) {
        const fallback = await supabase
          .from("specialist_services")
          .select(fallbackSelect)
          .eq("category_id", categoryId)
          .eq("is_active", true)
          .gte("price_from", 0)
          .in("specialists.status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
          .eq("specialists.is_active", true)
          .eq("specialists.is_visible", true);
        rows = extractRows(fallback.data);
        queryError = fallback.error;
        _trace.q3_fallbackSelect = { rows: rows.length, error: queryError?.message ?? null };
        console.log("[specialists/list] fallbackSelect:", _trace.q3_fallbackSelect);
      }
    }

    if (queryError) {
      console.error("[specialists/list] ALL queries failed:", queryError.message);
      return jsonNoStore(
        { error: 'Failed to fetch specialists', _trace },
        { status: 500 }
      );
    }

    let specialists = rows ?? [];
    _trace.rawRows = specialists.length;
    const uniqueById = new Map<string, SpecialistRow>();
    for (const row of specialists) {
      if (!row?.id || uniqueById.has(row.id)) continue;
      uniqueById.set(row.id, row);
    }
    let uniqueSpecialists = Array.from(uniqueById.values());
    _trace.uniqueAfterServices = uniqueSpecialists.length;

    // Fallback: when specialist_services.category_id is null/empty, use specialists.category_id
    if (uniqueSpecialists.length === 0) {
      let directSpecialists: Record<string, unknown>[] | null = null;
      let directError: { message?: string } | null = null;

      const fullDirect = await supabase
        .from("specialists")
        .select("id,slug,name,bio,avatar_url,category_id,languages,work_format,approved_at,created_at,lat,lng,mobile_service,service_radius_km")
        .eq("category_id", categoryId)
        .in("status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
        .eq("is_active", true)
        .eq("is_visible", true);

      directSpecialists = fullDirect.data as Record<string, unknown>[] | null;
      directError = fullDirect.error;

      if (directError) {
        console.log("[specialists/list] direct fullDirect failed, trying safe direct select:", directError.message);
        const safeDirect = await supabase
          .from("specialists")
          .select("id,slug,name,bio,avatar_url,category_id,languages,work_format,approved_at,created_at")
          .eq("category_id", categoryId)
          .in("status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
          .eq("is_active", true)
          .eq("is_visible", true);

        directSpecialists = safeDirect.data as Record<string, unknown>[] | null;
        directError = safeDirect.error;
      }

      _trace.directFallback = { found: directSpecialists?.length ?? 0, error: directError?.message ?? null };
      console.log("[specialists/list] direct fallback:", _trace.directFallback);

      if (!directError && Array.isArray(directSpecialists) && directSpecialists.length > 0) {
        const ids = directSpecialists.map((r) => r?.id).filter((id): id is string => Boolean(id));
        const { data: servicesForFallback } = await supabase
          .from("specialist_services")
          .select("specialist_id")
          .in("specialist_id", ids)
          .eq("is_active", true)
          .gte("price_from", 0);

        const specialistIdsWithServices = new Set(
          (servicesForFallback ?? [])
            .filter((r) => typeof r.specialist_id === "string")
            .map((r) => r.specialist_id as string)
        );
        _trace.directWithServices = specialistIdsWithServices.size;

        uniqueSpecialists = directSpecialists
          .filter((r) => r?.id && specialistIdsWithServices.has(String(r.id)))
          .map((r) => ({
            id: r.id as string,
            name: (r.name as string) ?? null,
            bio: (r.bio as string) ?? null,
            avatar_url: (r.avatar_url as string) ?? null,
            category_id: (r.category_id as string) ?? null,
            languages: (r.languages as string[]) ?? null,
            work_format: (r.work_format as WorkFormat) ?? null,
            approved_at: (r.approved_at as string) ?? null,
            created_at: (r.created_at as string) ?? null,
            lat: (r.lat as number) ?? null,
            lng: (r.lng as number) ?? null,
            mobile_service: (r.mobile_service as boolean) ?? null,
            service_radius_km: (r.service_radius_km as number) ?? null,
          })) as SpecialistRow[];
      }
    }

    const specialistIds = uniqueSpecialists.map((row) => row.id);

    // Explicitly fetch name from specialists table to guarantee correct source
    let nameBySpecialistId = new Map<string, string | null>();
    if (specialistIds.length > 0) {
      const { data: nameRows } = await supabase
        .from("specialists")
        .select("id, name")
        .in("id", specialistIds);
      for (const r of nameRows ?? []) {
        if (r?.id) {
          const n = typeof r.name === "string" && r.name.trim() ? r.name.trim() : null;
          nameBySpecialistId.set(r.id, n);
          if (process.env.NODE_ENV === "development") {
            console.log("[api/specialists/list] Specialist name from DB:", r.id, "->", n);
          }
        }
      }
    }

    const categoryTitlePromise = supabase
      .from('categories')
      .select('title, title_ru, title_de, title_ua')
      .eq('id', categoryId)
      .maybeSingle();

    let profileRows: ProfileRow[] = [];
    let serviceRows: ServiceRow[] = [];
    if (specialistIds.length > 0) {
      const fullProfile = await supabase
        .from('specialist_profiles')
        .select('specialist_id, photo_url, city, about_me, services, experience')
        .in('specialist_id', specialistIds);

      if (fullProfile.error && /column.*does not exist/i.test(fullProfile.error.message ?? '')) {
        const fallbackProfile = await supabase
          .from('specialist_profiles')
          .select('specialist_id, photo_url, city')
          .in('specialist_id', specialistIds);
        profileRows = (fallbackProfile.data as ProfileRow[] | null) ?? [];
      } else {
        profileRows = (fullProfile.data as ProfileRow[] | null) ?? [];
      }

      const servicesResponse = await supabase
        .from('specialist_services')
        .select('specialist_id, pricing_type, price_from, price_to, currency, price_comment')
        .in('specialist_id', specialistIds)
        .eq('category_id', categoryId)
        .eq('is_active', true);

      if (servicesResponse.error) {
        console.error('[api/specialists/list] services query failed', servicesResponse.error);
      } else {
        serviceRows = (servicesResponse.data as ServiceRow[] | null) ?? [];
      }
    }

    const profileBySpecialistId = new Map<string, ProfileRow>();
    for (const row of profileRows) {
      if (!row?.specialist_id || profileBySpecialistId.has(row.specialist_id)) continue;
      profileBySpecialistId.set(row.specialist_id, row);
    }

    const servicesBySpecialistId = new Map<string, ServiceRow[]>();
    for (const row of serviceRows) {
      if (!row?.specialist_id) continue;
      const list = servicesBySpecialistId.get(row.specialist_id) ?? [];
      list.push(row);
      servicesBySpecialistId.set(row.specialist_id, list);
    }

    const serviceMetaBySpecialistId = new Map<string, SpecialistServiceListMeta>();
    servicesBySpecialistId.forEach((rows, specialistId) => {
      const meta = aggregateSpecialistServicesForList(rows);
      if (meta) serviceMetaBySpecialistId.set(specialistId, meta);
    });

    const { data: categoryData } = await categoryTitlePromise;
    const categoryTitle = categoryData?.title ?? null;

    const nowTs = Date.now();
    const merged = uniqueSpecialists.map((row) => {
      const serviceMeta = serviceMetaBySpecialistId.get(row.id);
      const profile = profileBySpecialistId.get(row.id);
      const approvedAt = row.approved_at ?? row.created_at ?? null;
      const approvedTs = approvedAt ? Date.parse(approvedAt) : NaN;
      const newUntilTs = Number.isFinite(approvedTs)
        ? approvedTs + 14 * 24 * 60 * 60 * 1000
        : null;
      const newUntil = newUntilTs ? new Date(newUntilTs).toISOString() : null;
      const nameFromDb = nameBySpecialistId.get(row.id) ?? (typeof row.name === "string" && row.name.trim() ? row.name.trim() : null);

      const specLat = toSpecialistCoord(row.lat);
      const specLng = toSpecialistCoord(row.lng);

      return {
        id: row.id,
        slug: (typeof row.slug === 'string' && row.slug.trim()) ? row.slug.trim() : normalizeSlug(nameFromDb || '', row.id),
        name: nameFromDb,
        avatar_url: profile?.photo_url ?? row.avatar_url ?? null,
        about_line: pickAboutLine({
          profileAbout: profile?.about_me ?? null,
          profileServices: profile?.services ?? null,
          specialistBio: row.bio ?? null,
          categoryTitle,
        }),
        city: profile?.city?.trim() || null,
        work_format: (row.work_format ?? 'online') as WorkFormat,
        languages: Array.isArray(row.languages) ? row.languages.slice(0, 8) : [],
        is_verified: false,
        is_new: Boolean(newUntilTs && nowTs < newUntilTs),
        new_until: newUntil,
        _sort_new_ts: Number.isFinite(approvedTs) ? approvedTs : 0,
        _sort_experience: parseExperienceYears(profile?.experience),
        min_price_from: serviceMeta?.min_price_from ?? null,
        min_price_to: serviceMeta?.min_price_to ?? null,
        min_pricing_type: serviceMeta?.min_pricing_type ?? null,
        min_currency: serviceMeta?.min_currency ?? null,
        active_services_count: serviceMeta?.active_services_count ?? 0,
        price_comment: serviceMeta?.price_comment ?? null,
        mobile_service: Boolean(row.mobile_service),
        service_radius_km:
          typeof row.service_radius_km === 'number' && Number.isFinite(row.service_radius_km) && row.service_radius_km > 0
            ? row.service_radius_km
            : null,
        lat: specLat,
        lng: specLng,
      };
    });

    if (process.env.NODE_ENV === "development") {
      for (const row of merged) {
        console.log("PRICE COMMENT FLOW:", { id: row.id, price_comment: row.price_comment });
      }
    }

    _trace.merged = merged.length;
    if (debugEnabled) {
      _trace.mergedDetails = merged.map((s) => ({ id: s.id, name: s.name, price: s.min_price_from }));
    }
    console.log("STEP 1 merged:", merged.length);

    const withDistance = merged.map((s) => {
      if (
        userLat == null ||
        userLng == null ||
        !Number.isFinite(userLat) ||
        !Number.isFinite(userLng) ||
        s.lat == null ||
        s.lng == null ||
        !Number.isFinite(s.lat) ||
        !Number.isFinite(s.lng)
      ) {
        return { ...s, distance: null as number | null };
      }

      return {
        ...s,
        distance: getDistanceKm(userLat, userLng, s.lat, s.lng),
      };
    });

    const geoFiltered = withDistance.filter((s) => {
      if (s.work_format === "online") return true;

      if (userLat == null || userLng == null || !Number.isFinite(userLat) || !Number.isFinite(userLng)) {
        return true;
      }

      if (s.lat == null || s.lng == null || !Number.isFinite(s.lat) || !Number.isFinite(s.lng)) {
        return true;
      }

      if (!s.mobile_service) return true;

      if (s.service_radius_km == null || s.service_radius_km <= 0) return true;

      if (s.distance === null) return true;

      return s.distance <= s.service_radius_km;
    });

    _trace.geoFiltered = geoFiltered.length;
    console.log("STEP 2 geoFiltered:", geoFiltered.length);

    const filtered = geoFiltered.filter((row) => {
      const languageMatch = !language
        || row.languages.some((value) => value?.toLowerCase() === language);
      const cityMatch = !city || row.city?.toLowerCase() === city;
      // TEMP: disabled price filter for diagnostics
      const hasActiveServiceWithPrice = true;
      return languageMatch && cityMatch && hasActiveServiceWithPrice;
    });

    _trace.filtered = filtered.length;
    console.log("STEP 4 final:", filtered.length);

    if (sort === 'new') {
      filtered.sort((a, b) => b._sort_new_ts - a._sort_new_ts);
    } else if (sort === 'experience') {
      filtered.sort((a, b) => (b._sort_experience ?? -1) - (a._sort_experience ?? -1));
    } else {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'uk'));
    }

    const total = filtered.length;
    const page = filtered.slice(offset, offset + limit).map((row) => {
      const { distance: _d, lat: _lat, lng: _lng, ...rest } = row;
      return {
        id: rest.id,
        slug: rest.slug,
        name: rest.name,
        avatar_url: rest.avatar_url,
        about_line: rest.about_line,
        city: rest.city,
        work_format: rest.work_format,
        languages: rest.languages,
        is_verified: rest.is_verified,
        is_new: rest.is_new,
        new_until: rest.new_until,
        min_price_from: rest.min_price_from,
        min_price_to: rest.min_price_to,
        min_pricing_type: rest.min_pricing_type,
        min_currency: rest.min_currency,
        active_services_count: rest.active_services_count,
        price_comment: rest.price_comment,
        mobile_service: rest.mobile_service,
        service_radius_km: rest.service_radius_km,
      };
    });
    const hasMore = offset + page.length < total;

    const languageOptions = Array.from(
      new Set(
        merged.flatMap((row) =>
          row.languages.map((value) => value?.trim()).filter(Boolean) as string[]
        )
      )
    ).sort((a, b) => a.localeCompare(b, 'uk'));

    const cityOptions = Array.from(
      new Set(
        merged
          .map((row) => row.city?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b, 'uk'));

    _trace.page = page.length;
    _trace.total = total;
    _trace.categoryId = categoryId;
    _trace.params = { language, city, sort, userLat, userLng };

    return jsonNoStore({
      data: page,
      meta: {
        total,
        limit,
        offset,
        next_offset: offset + page.length,
        has_more: hasMore,
        filter_options: {
          languages: languageOptions,
          cities: cityOptions,
        },
      },
      _trace,
    });
  } catch (error: any) {
    console.error('[api/specialists] Unexpected error:', error);
    return jsonNoStore(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
