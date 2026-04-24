import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from '@/lib/specialists/status';
import { CACHE_PUBLIC_FILTERS, jsonWithCache } from '@/lib/http/cache';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();

    // Categories list (slug + title)
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('slug, title, title_ru, title_de, title_ua')
      .order('title', { ascending: true });

    if (categoryError) {
      console.error('[api/filters] categories error', categoryError);
      return NextResponse.json(
        { error: 'Failed to load categories' },
        { status: 500, headers: NO_STORE }
      );
    }

    // Postal codes (distinct) — public specialists only
    const { data: postalData, error: postalError } = await supabase
      .from('specialists')
      .select('postal_code')
      .not('postal_code', 'is', null)
      .in('status', [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
      .eq('is_active', true)
      .eq('is_visible', true)
      .or('is_test.is.null,is_test.eq.false')
      .order('postal_code', { ascending: true });

    if (postalError) {
      console.error('[api/filters] postal error', postalError);
      return NextResponse.json(
        { error: 'Failed to load postal codes' },
        { status: 500, headers: NO_STORE }
      );
    }

    const postalSet = new Set<string>();
    postalData?.forEach((row) => {
      if (row.postal_code) postalSet.add(String(row.postal_code));
    });
    const postal_codes = Array.from(postalSet).sort();

    // Languages (distinct) — public specialists only
    const { data: langData, error: langError } = await supabase
      .from('specialists')
      .select('languages')
      .in('status', [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
      .eq('is_active', true)
      .eq('is_visible', true)
      .or('is_test.is.null,is_test.eq.false');

    if (langError) {
      console.error('[api/filters] languages error', langError);
      return NextResponse.json(
        { error: 'Failed to load languages' },
        { status: 500, headers: NO_STORE }
      );
    }

    const langSet = new Set<string>();
    langData?.forEach((row) => {
      if (Array.isArray(row.languages)) {
        row.languages.forEach((l: string) => l && langSet.add(l));
      }
    });
    const languages = Array.from(langSet).sort();

    return jsonWithCache(
      {
        categories: categoryData || [],
        postal_codes,
        languages,
      },
      CACHE_PUBLIC_FILTERS
    );
  } catch (error: unknown) {
    console.error('[api/filters] unexpected', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: NO_STORE }
    );
  }
}
