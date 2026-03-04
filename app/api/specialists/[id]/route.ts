import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const raw = params.id;

    const supabase = createSupabaseServerClient();

    let specialistQuery = supabase
      .from('specialists')
      .select('*')
      .in('status', [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
      .eq("is_active", true)
      .eq("is_visible", true);

    const isUuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw);
    specialistQuery = isUuidLike ? specialistQuery.eq("id", raw) : specialistQuery.eq("slug", raw);

    const { data: specialist, error } = await specialistQuery.single();

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

    const { data: plan } = await supabase
      .from("specialist_plan")
      .select("plan_code, plan_status")
      .eq("specialist_id", specialist.id)
      .maybeSingle();

    const data = {
      ...specialist,
      avatar_url: profile?.photo_url ?? specialist.avatar_url ?? null,
      video_url: profile?.video_url ?? null,
      gallery_urls: profile?.gallery_urls ?? [],
      certificate_urls: profile?.certificate_urls ?? [],
      plan_code: typeof plan?.plan_code === "string" ? plan.plan_code : "free",
      plan_status: typeof plan?.plan_status === "string" ? plan.plan_status : "active",
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
