import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Force dynamic so Next.js does not attempt to prerender this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category_id');

    if (!categoryId) {
      return NextResponse.json(
        { error: 'category_id parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from('specialists')
      .select('*')
      .eq('category_id', categoryId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[api/specialists] Error fetching specialists:', error);
      return NextResponse.json(
        { error: 'Failed to fetch specialists', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    console.error('[api/specialists] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
