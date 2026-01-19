import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdminToken } from '@/lib/adminApiAuth';

const ALLOWED_STATUSES = ['new', 'contacted', 'closed'] as const;
type LeadStatus = (typeof ALLOWED_STATUSES)[number];

export async function PATCH(request: NextRequest) {
  const authResponse = requireAdminToken(request);
  if (authResponse) return authResponse;

  try {
    const body = await request.json().catch(() => null);
    const id = body?.id;
    const status = body?.status;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!status || typeof status !== 'string') {
      return NextResponse.json(
        { error: 'status is required' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!ALLOWED_STATUSES.includes(status as LeadStatus)) {
      return NextResponse.json(
        { error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
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
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      { data },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[admin] Unexpected error updating lead status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

