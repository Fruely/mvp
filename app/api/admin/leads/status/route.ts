import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const ALLOWED_STATUSES = ['new', 'contacted', 'closed'] as const;
type LeadStatus = (typeof ALLOWED_STATUSES)[number];

export async function PATCH(request: NextRequest) {
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
    const body = await request.json().catch(() => null);
    const id = body?.id;
    const status = body?.status;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    if (!status || typeof status !== 'string') {
      return NextResponse.json(
        { error: 'status is required' },
        { status: 400 }
      );
    }

    if (!ALLOWED_STATUSES.includes(status as LeadStatus)) {
      return NextResponse.json(
        { error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', id)
      .select(
        'id, specialist_id, client_name, client_email, client_phone, message, status, created_at'
      )
      .maybeSingle();

    if (error) {
      console.error('[admin] Error updating lead status:', error);
      return NextResponse.json(
        { error: 'Failed to update lead status' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('[admin] Unexpected error updating lead status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

