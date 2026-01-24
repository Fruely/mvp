import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdminToken } from '@/lib/adminApiAuth';

export async function POST(request: NextRequest) {
  const authResponse = requireAdminToken(request);
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const { id, status, rejection_reason } = body;

    if (!id || !status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid request: id and status (approved/rejected) required' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const supabase = createSupabaseServerClient();

    const updateData: Record<string, any> = {
      status,
      is_approved: status === 'approved',
    };

    if (status === 'approved') {
      updateData.approved_at = new Date().toISOString();
    } else if (status === 'rejected') {
      updateData.rejected_at = new Date().toISOString();
      if (rejection_reason) {
        updateData.rejection_reason = rejection_reason;
      }
    }

    const { error, data } = await supabase
      .from('specialists')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('[admin] Error updating specialist:', error);
      return NextResponse.json(
        { error: 'Failed to update specialist' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Specialist not found' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      { success: true, updated: data[0] },
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
