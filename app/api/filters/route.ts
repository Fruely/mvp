import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();

    // Categories list (slug + title)
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('slug,title')
      .order('title', { ascending: true });

    if (categoryError) {
      console.error('[api/filters] categories error', categoryError);
      return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 });
    }

    // Postal codes (distinct)
    const { data: postalData, error: postalError } = await supabase
      .from('specialists')
      .select('postal_code')
      .not('postal_code', 'is', null)
      .order('postal_code', { ascending: true });

    if (postalError) {
      console.error('[api/filters] postal error', postalError);
      return NextResponse.json({ error: 'Failed to load postal codes' }, { status: 500 });
    }

    const postalSet = new Set<string>();
    postalData?.forEach((row) => {
      if (row.postal_code) postalSet.add(String(row.postal_code));
    });
    const postal_codes = Array.from(postalSet).sort();

    // Languages (distinct from array column)
    const { data: langData, error: langError } = await supabase
      .from('specialists')
      .select('languages');

    if (langError) {
      console.error('[api/filters] languages error', langError);
      return NextResponse.json({ error: 'Failed to load languages' }, { status: 500 });
    }

    const langSet = new Set<string>();
    langData?.forEach((row) => {
      if (Array.isArray(row.languages)) {
        row.languages.forEach((l: string) => l && langSet.add(l));
      }
    });
    const languages = Array.from(langSet).sort();

    return NextResponse.json({
      categories: categoryData || [],
      postal_codes,
      languages,
    });
  } catch (error: any) {
    console.error('[api/filters] unexpected', error);
    return NextResponse.json({ error: 'Internal error', details: error.message }, { status: 500 });
  }
}
