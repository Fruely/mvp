import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const supabase = createSupabaseServerClient();

    const { data: specialist, error } = await supabase
      .from('specialists')
      .select('*')
      .eq('id', id)
      .eq('status', 'approved')
      .single();

    if (error || !specialist) {
      console.error('[api/specialists/detail] Error:', error);
      return NextResponse.json(
        { error: 'Specialist not found' },
        { status: 404 }
      );
    }

    const { data: profile } = await supabase
      .from('specialist_profiles')
      .select('photo_url, video_url, gallery_urls, certificate_urls')
      .eq('specialist_id', specialist.id)
      .maybeSingle();

    const data = {
      ...specialist,
      avatar_url: profile?.photo_url ?? specialist.avatar_url ?? null,
      video_url: profile?.video_url ?? null,
      gallery_urls: profile?.gallery_urls ?? [],
      certificate_urls: profile?.certificate_urls ?? [],
    };

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    console.error('[api/specialists/detail] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
