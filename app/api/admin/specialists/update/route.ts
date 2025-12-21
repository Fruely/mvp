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

    console.log(`[admin] Updating specialist ${id} to status: ${status}`);

    const { error, data } = await supabase
      .from('specialists')
      .update({ 
        status,
        is_approved: status === 'approved'
      })
      .eq('id', id)
      .select();

    console.log(`[admin] Update result: error=${error}, updated rows=${data?.length || 0}`);

    if (error) {
      console.error('[admin] Error updating specialist:', error);
      return NextResponse.json(
        { error: 'Failed to update specialist', details: error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      console.warn(`[admin] No specialist found with id: ${id}`);
      return NextResponse.json(
        { error: 'Specialist not found', details: `No specialist with id ${id}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, updated: data[0] }, { status: 200 });
  } catch (error: any) {
    console.error('[admin] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
