import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Force dynamic so Next.js does not attempt to prerender this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const categoryId = searchParams.get('category_id') || searchParams.get('categoryId');

    if (!categoryId) {
      return NextResponse.json(
        { error: 'category_id parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    console.log("[list] SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

    const { data, error } = await supabase
      .from("specialists")
      .select("id,name,category_id,status,is_active,is_visible")
      .eq("status", "approved")
      .eq("is_active", true)
      .eq("is_visible", true)
      .eq("category_id", categoryId);

    console.log("[list] RAW DATA FROM SUPABASE:", data);
    console.log("[list] ERROR:", error);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch specialists', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('[api/specialists] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
