import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Env diagnostics: log Supabase project ref for comparison
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const projectRefMatch = supabaseUrl?.match(/^https?:\/\/([^.]+)\.supabase\.co/);
    const projectRef = projectRefMatch ? projectRefMatch[1] : null;
    console.log('[env] admin/pending SUPABASE_URL:', supabaseUrl, 'project_ref:', projectRef);

    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from('specialists')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[admin] Error fetching pending specialists:', error);
      return NextResponse.json(
        { error: 'Failed to fetch specialists', details: error.message },
        { status: 500 }
      );
    }

    console.log('[admin api] Pending specialists count:', data?.length || 0);
    console.log('[admin api] Pending specialists:', data?.map(s => ({ id: s.id, name: s.name, status: s.status, email: s.email })));
    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    console.error('[admin] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
