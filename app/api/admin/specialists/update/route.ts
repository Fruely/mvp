import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid request: id and status (approved/rejected) required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { error } = await supabase
      .from('specialists')
      .update({ 
        status,
        is_approved: status === 'approved'
      })
      .eq('id', id);

    if (error) {
      console.error('[admin] Error updating specialist:', error);
      return NextResponse.json(
        { error: 'Failed to update specialist', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('[admin] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
