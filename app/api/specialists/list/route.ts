import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Force dynamic so Next.js does not attempt to prerender this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Env diagnostics: log Supabase URL and extract project_ref
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const projectRefMatch = supabaseUrl?.match(/^https?:\/\/([^.]+)\.supabase\.co/);
    const projectRef = projectRefMatch ? projectRefMatch[1] : null;
    console.log('[env list] SUPABASE_URL:', supabaseUrl, 'project_ref:', projectRef);
    
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
    
    const { data: approvedSpecialists, error } = await supabase
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
    
    console.log('[api/specialists/list] Query succeeded');
    console.log('[api/specialists/list] Found approved specialists:', approvedSpecialists?.length || 0);
    if (approvedSpecialists && approvedSpecialists.length > 0) {
      console.log('[api/specialists/list] First specialist:', { id: approvedSpecialists[0].id, name: approvedSpecialists[0].name, status: approvedSpecialists[0].status });
    }

    return NextResponse.json({ 
      data: approvedSpecialists,
      meta: {
        project_ref: projectRef,
        has_url: !!supabaseUrl
      }
    }, { status: 200 });
  } catch (error: any) {
    console.error('[api/specialists] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
