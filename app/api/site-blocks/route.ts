import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminToken } from '@/lib/adminApiAuth';

export const revalidate = 300;

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

type MosaicImage = {
  url?: string;
  alt?: string;
  category_id?: string;
};

type MosaicContent = {
  title?: string;
  subtitle?: string;
  images?: MosaicImage[];
};

async function normalizeMosaicCategories(
  supabase: ReturnType<typeof getSupabaseClient>,
  content: MosaicContent
) {
  const images = Array.isArray(content.images) ? content.images : [];
  if (!images.length) return { content, error: null as string | null };
  if (!supabase) return { content, error: 'Supabase env is not configured' };

  const { data: categories, error } = await supabase
    .from('categories')
    .select('id, slug');

  if (error) {
    return { content, error: `Не удалось загрузить категории: ${error.message}` };
  }

  const slugSet = new Set((categories ?? []).map((c) => c.slug));
  const idToSlug = new Map((categories ?? []).map((c) => [c.id, c.slug] as const));
  const invalidCategoryIds: string[] = [];

  const normalizedImages = images.map((image) => {
    const raw = typeof image?.category_id === 'string' ? image.category_id.trim() : '';
    if (!raw) return image;
    if (slugSet.has(raw)) return { ...image, category_id: raw };

    const mappedSlug = idToSlug.get(raw);
    if (mappedSlug) return { ...image, category_id: mappedSlug };

    invalidCategoryIds.push(raw);
    return image;
  });

  if (invalidCategoryIds.length > 0) {
    const uniqueInvalid = Array.from(new Set(invalidCategoryIds)).join(', ');
    return {
      content,
      error: `Mosaic содержит неизвестные category_id: ${uniqueInvalid}`,
    };
  }

  return {
    content: { ...content, images: normalizedImages },
    error: null as string | null,
  };
}

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase env is not configured' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('site_blocks')
      .select('*')
      .order('key', { ascending: true });
    if (error) {
      console.error('[site-blocks API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { blocks: data },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=59",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResponse = requireAdminToken(request);
  if (authResponse) return authResponse;

  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase env is not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { key, type, content } = body;
    if (!key || !type || !content) {
      return NextResponse.json({ error: 'Не указаны поля' }, { status: 400 });
    }

    let normalizedContent = content;
    if (key === 'homepage_mosaic' && type === 'mosaic') {
      const normalized = await normalizeMosaicCategories(supabase, content as MosaicContent);
      if (normalized.error) {
        return NextResponse.json({ error: normalized.error }, { status: 400 });
      }
      normalizedContent = normalized.content;
    }

    const { data, error } = await supabase
      .from('site_blocks')
      .upsert({ key, type, content: normalizedContent }, { onConflict: 'key' })
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, block: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
