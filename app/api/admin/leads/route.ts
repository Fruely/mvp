import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const adminToken = request.headers.get('x-admin-token');
  const expectedToken = process.env.ADMIN_API_TOKEN;

  if (!expectedToken) {
    console.error('[admin] Missing ADMIN_API_TOKEN env var');
    return NextResponse.json(
      { error: 'Server misconfigured' },
      { status: 500 }
    );
  }

  if (!adminToken || adminToken !== expectedToken) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from('leads')
      .select(
        'id, specialist_id, client_name, client_email, client_phone, message, status, created_at'
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[admin] Error fetching leads:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('[admin] Unexpected error fetching leads:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

