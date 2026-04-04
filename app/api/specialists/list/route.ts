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

    const userLat =
      parseOptionalCoord(searchParams.get("user_lat")) ??
      parseOptionalCoord(searchParams.get("lat"));
    const userLng =
      parseOptionalCoord(searchParams.get("user_lng")) ??
      parseOptionalCoord(searchParams.get("lng"));

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
    const fallbackSelect =
      'specialist_id,specialists!inner(id,slug,name,bio,avatar_url,category_id,languages,created_at,lat,lng,mobile_service,service_radius_km)';

    let rows: SpecialistRow[] | null = null;
    let queryError: { message?: string } | null = null;

    const initial = await supabase
      .from("specialist_services")
      .select(fullSelect)
      .eq("category_id", categoryId)
      .eq("is_active", true)
      .gte("price_from", 0)
      .in("specialists.status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
      .eq("specialists.is_active", true)
      .eq("specialists.is_visible", true);

    rows = ((initial.data as ServiceWithSpecialistRow[] | null) ?? [])
      .map((row) =>
        Array.isArray(row.specialists) ? row.specialists[0] ?? null : row.specialists
      )
      .filter((row): row is SpecialistRow => Boolean(row));
    queryError = initial.error;

    if (queryError && /column.*does not exist/i.test(queryError.message ?? '')) {
      const fallback = await supabase
        .from("specialist_services")
        .select(fallbackSelect)
        .eq("category_id", categoryId)
        .eq("is_active", true)
        .gte("price_from", 0)
        .in("specialists.status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
        .eq("specialists.is_active", true)
        .eq("specialists.is_visible", true);
      rows = ((fallback.data as ServiceWithSpecialistRow[] | null) ?? [])
        .map((row) =>
          Array.isArray(row.specialists) ? row.specialists[0] ?? null : row.specialists
        )
        .filter((row): row is SpecialistRow => Boolean(row));
      queryError = fallback.error;
    }

    if (queryError) {
      return jsonNoStore(
        { error: 'Failed to fetch specialists' },
        { status: 500 }
      );
    }

    let specialists = rows ?? [];
    const uniqueById = new Map<string, SpecialistRow>();
    for (const row of specialists) {
      if (!row?.id || uniqueById.has(row.id)) continue;
      uniqueById.set(row.id, row);
    }
    let uniqueSpecialists = Array.from(uniqueById.values());

    // Fallback: when specialist_services.category_id is null/empty, use specialists.category_id
    if (uniqueSpecialists.length === 0) {
      const { data: directSpecialists, error: directError } = await supabase
        .from("specialists")
        .select("id,slug,name,bio,avatar_url,category_id,languages,work_format,approved_at,created_at,lat,lng,mobile_service,service_radius_km")
        .eq("category_id", categoryId)
        .in("status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
        .eq("is_active", true)
        .eq("is_visible", true);

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

        uniqueSpecialists = directSpecialists
          .filter((r) => r?.id && specialistIdsWithServices.has(r.id))
          .map((r) => ({
            id: r.id,
            name: r.name ?? null,
            bio: r.bio ?? null,
            avatar_url: r.avatar_url ?? null,
            category_id: r.category_id ?? null,
            languages: r.languages ?? null,
            work_format: r.work_format ?? null,
            approved_at: r.approved_at ?? null,
            created_at: r.created_at ?? null,
            lat: r.lat ?? null,
            lng: r.lng ?? null,
            mobile_service: r.mobile_service ?? null,
            service_radius_km: r.service_radius_km ?? null,
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
        .select('specialist_id, pricing_type, price_from, price_to, currency')
        .in('specialist_id', specialistIds)
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

    const serviceMetaBySpecialistId = new Map<
      string,
      {
        min_price_from: number;
        min_price_to: number | null;
        min_pricing_type: ServicePricingType;
        min_currency: string;
        active_services_count: number;
      }
    >();
    for (const row of serviceRows) {
      if (!row?.specialist_id) continue;
      if (typeof row.price_from !== 'number' || !Number.isFinite(row.price_from)) continue;
      if (row.price_from < 0) continue;
      const pricingType: ServicePricingType =
        row.pricing_type === 'range' || row.pricing_type === 'hourly' || row.pricing_type === 'fixed'
          ? row.pricing_type
          : 'fixed';
      const currency =
        typeof row.currency === 'string' && row.currency.trim() ? row.currency.trim() : 'EUR';
      const nextPriceTo =
        typeof row.price_to === 'number' && Number.isFinite(row.price_to) ? row.price_to : null;

      const prev = serviceMetaBySpecialistId.get(row.specialist_id);
      if (!prev) {
        serviceMetaBySpecialistId.set(row.specialist_id, {
          min_price_from: row.price_from,
          min_price_to: nextPriceTo,
          min_pricing_type: pricingType,
          min_currency: currency,
          active_services_count: 1,
        });
        continue;
      }
      const isBetter = row.price_from < prev.min_price_from;
      serviceMetaBySpecialistId.set(row.specialist_id, {
        min_price_from: isBetter ? row.price_from : prev.min_price_from,
        min_price_to: isBetter ? nextPriceTo : prev.min_price_to,
        min_pricing_type: isBetter ? pricingType : prev.min_pricing_type,
        min_currency: isBetter ? currency : prev.min_currency,
        active_services_count: prev.active_services_count + 1,
      });
    }

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
        mobile_service: Boolean(row.mobile_service),
        service_radius_km:
          typeof row.service_radius_km === 'number' && Number.isFinite(row.service_radius_km) && row.service_radius_km > 0
            ? row.service_radius_km
            : null,
        lat: specLat,
        lng: specLng,
      };
    });

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

    const filtered = geoFiltered.filter((row) => {
      const languageMatch = !language
        || row.languages.some((value) => value?.toLowerCase() === language);
      const cityMatch = !city || row.city?.toLowerCase() === city;
      const hasActiveServiceWithPrice =
        typeof row.min_price_from === 'number' && Number.isFinite(row.min_price_from);
      return languageMatch && cityMatch && hasActiveServiceWithPrice;
    });

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
    });
  } catch (error: any) {
    console.error('[api/specialists] Unexpected error:', error);
    return jsonNoStore(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
