import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdminToken } from '@/lib/adminApiAuth';

export async function GET(request: NextRequest) {
  const authResponse = requireAdminToken(request);
  if (authResponse) return authResponse;

  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from('leads')
      .select(
        'id, specialist_id, client_name, client_email, client_phone, message, status, created_at, specialist:specialists(id, name, category_id)'
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[admin] Error fetching leads:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leads (specialist join)' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      { data },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[admin] Unexpected error fetching leads:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

