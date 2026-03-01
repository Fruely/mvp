import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Force dynamic so Next.js does not attempt to prerender this API route
export const dynamic = 'force-dynamic';

type WorkFormat = 'online' | 'offline' | 'hybrid';
type SortMode = 'relevance' | 'new' | 'experience';

type SpecialistRow = {
  id: string;
  name: string | null;
  bio: string | null;
  avatar_url: string | null;
  category_id: string | null;
  languages: string[] | null;
  work_format?: WorkFormat | null;
  approved_at?: string | null;
  created_at?: string | null;
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

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const categoryId = searchParams.get('category_id') || searchParams.get('categoryId');
    const limit = Math.min(parsePositiveInt(searchParams.get('limit'), 12), 50);
    const offset = parsePositiveInt(searchParams.get('offset'), 0);
    const language = searchParams.get('language')?.trim().toLowerCase() ?? '';
    const city = searchParams.get('city')?.trim().toLowerCase() ?? '';
    const sort = (searchParams.get('sort') as SortMode | null) ?? 'relevance';

    if (!categoryId) {
      return NextResponse.json(
        { error: 'category_id parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    type SelectCols =
      | 'id,name,bio,avatar_url,category_id,languages,work_format,approved_at,created_at'
      | 'id,name,bio,avatar_url,category_id,languages,created_at';

    const fullSelect: SelectCols =
      'id,name,bio,avatar_url,category_id,languages,work_format,approved_at,created_at';
    const fallbackSelect: SelectCols =
      'id,name,bio,avatar_url,category_id,languages,created_at';

    let rows: SpecialistRow[] | null = null;
    let queryError: { message?: string } | null = null;

    const initial = await supabase
      .from("specialists")
      .select(fullSelect)
      .eq("status", "approved")
      .eq("is_active", true)
      .eq("is_visible", true)
      .eq("category_id", categoryId);

    rows = (initial.data as SpecialistRow[] | null) ?? null;
    queryError = initial.error;

    if (queryError && /column.*does not exist/i.test(queryError.message ?? '')) {
      const fallback = await supabase
        .from("specialists")
        .select(fallbackSelect)
        .eq("status", "approved")
        .eq("is_active", true)
        .eq("is_visible", true)
        .eq("category_id", categoryId);
      rows = (fallback.data as SpecialistRow[] | null) ?? null;
      queryError = fallback.error;
    }

    if (queryError) {
      return NextResponse.json(
        { error: 'Failed to fetch specialists' },
        { status: 500 }
      );
    }

    const specialists = rows ?? [];
    const uniqueById = new Map<string, SpecialistRow>();
    for (const row of specialists) {
      if (!row?.id || uniqueById.has(row.id)) continue;
      uniqueById.set(row.id, row);
    }
    const uniqueSpecialists = Array.from(uniqueById.values());
    const specialistIds = uniqueSpecialists.map((row) => row.id);

    const categoryTitlePromise = supabase
      .from('categories')
      .select('title')
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

      return {
        id: row.id,
        slug: normalizeSlug(row.name?.trim() || '', row.id),
        name: row.name?.trim() || 'Specialist',
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
      };
    });

    const filtered = merged.filter((row) => {
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
      filtered.sort((a, b) => a.name.localeCompare(b.name, 'uk'));
    }

    const total = filtered.length;
    const page = filtered.slice(offset, offset + limit).map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      avatar_url: row.avatar_url,
      about_line: row.about_line,
      city: row.city,
      work_format: row.work_format,
      languages: row.languages,
      is_verified: row.is_verified,
      is_new: row.is_new,
      new_until: row.new_until,
      min_price_from: row.min_price_from,
      min_price_to: row.min_price_to,
      min_pricing_type: row.min_pricing_type,
      min_currency: row.min_currency,
      active_services_count: row.active_services_count,
    }));
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

    return NextResponse.json({
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
