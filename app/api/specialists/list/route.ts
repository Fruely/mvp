import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Force dynamic so Next.js does not attempt to prerender this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    // Log the full search params for diagnosis
    console.log('[api/specialists/list] request.url:', request.url);
    console.log('[api/specialists/list] searchParams:', Object.fromEntries(searchParams.entries()));

    // Normalize to single canonical param name: category_id
    const paramCategoryId = searchParams.get('category_id') || searchParams.get('categoryId');
    if (searchParams.get('categoryId') && !searchParams.get('category_id')) {
      console.warn('[api/specialists/list] Received deprecated param "categoryId". Please use "category_id".');
    }

    const categoryId = paramCategoryId && paramCategoryId !== 'undefined' && paramCategoryId !== 'null' ? paramCategoryId : null;

    if (!categoryId) {
      return NextResponse.json(
        { error: 'category_id parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    console.log('[api/specialists/list] Query:', { category_id: categoryId, status: 'approved' });
    
    // Debug: Check all specialists in this category (any status)
    const { data: allData } = await supabase
      .from('specialists')
      .select('id, name, status, category_id')
      .eq('category_id', categoryId);
    console.log('[api/specialists/list] DEBUG - All specialists in category:', allData);
    
    const { data, error } = await supabase
      .from('specialists')
      .select('*')
      .eq('category_id', categoryId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[api/specialists/list] Error fetching specialists:', error);
      return NextResponse.json(
        { error: 'Failed to fetch specialists', details: error.message },
        { status: 500 }
      );
    }
    
    console.log('[api/specialists/list] Found approved specialists:', data?.length || 0, data?.map(s => ({ id: s.id, name: s.name, status: s.status })));

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    console.error('[api/specialists] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
