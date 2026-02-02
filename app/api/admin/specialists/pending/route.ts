import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdminToken } from '@/lib/adminApiAuth';

export async function GET(request: NextRequest) {
  const authResponse = requireAdminToken(request);
  if (authResponse) return authResponse;

  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const status =
      statusParam === 'approved' || statusParam === 'rejected'
        ? statusParam
        : 'pending_review';

    const supabase = createSupabaseServerClient();

    const cols = 'id, email, name, phone, category_id, stoir_number, about_short, proof_link, created_at, status, rejection_reason, rejected_at';
    let query = supabase
      .from('specialist_applications')
      .select(cols)
      .eq('status', status);

    if (status === 'pending_review') {
      query = query.not('email_confirmed_at', 'is', null);
    }

    const { data: rows, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[admin] Error fetching applications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch applications' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const categoryIds = Array.from(new Set((rows || []).map((r: { category_id?: string | null }) => r.category_id).filter(Boolean))) as string[];
    let categoryMap: Record<string, string> = {};
    if (categoryIds.length > 0) {
      const { data: cats } = await supabase
        .from('categories')
        .select('id, title, slug')
        .in('id', categoryIds);
      (cats || []).forEach((c: { id: string; title?: string; slug?: string }) => {
        categoryMap[c.id] = c.title || c.slug || c.id;
      });
    }

    const data = (rows || []).map((row: { category_id?: string | null; [k: string]: unknown }) => ({
      ...row,
      category: row.category_id ? (categoryMap[row.category_id] ?? row.category_id) : null,
    }));

    return NextResponse.json(
      { data },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    console.error('[admin] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
