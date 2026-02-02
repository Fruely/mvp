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

    let query = supabase
      .from('specialist_applications')
      .select('*')
      .eq('status', status);

    // For pending_review, only show applications with confirmed email
    if (status === 'pending_review') {
      query = query.not('email_confirmed_at', 'is', null);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[admin] Error fetching pending specialists:', error);
      return NextResponse.json(
        { error: 'Failed to fetch specialists' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

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
