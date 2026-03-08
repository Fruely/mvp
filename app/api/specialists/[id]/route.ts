import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { jsonNoStore } from "@/lib/api/response";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const raw = params.id;

    console.log("SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log(
      "SUPABASE KEY ISSUER:",
      process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 40) ??
        process.env.SUPABASE_SERVICE_KEY?.slice(0, 40)
    );

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

    if (process.env.NODE_ENV === "development" && specialist) {
      console.log("[api/specialists/[id]] Specialist name from DB:", specialist.id, "->", specialist.name);
    }

    if (error || !specialist) {
      console.error('[api/specialists/detail] Error:', error);
      return jsonNoStore({ error: 'Specialist not found' }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from('specialist_profiles')
      .select('photo_url, video_url, gallery_urls, certificate_urls, about_me, city')
      .eq('specialist_id', specialist.id)
      .maybeSingle();

    const { data: plan } = await supabase
      .from("specialist_plan")
      .select("plan_code, plan_status")
      .eq("specialist_id", specialist.id)
      .maybeSingle();

    const nameFromDb = typeof specialist.name === "string" && specialist.name.trim() ? specialist.name.trim() : null;
    const data = {
      ...specialist,
      name: nameFromDb,
      avatar_url: profile?.photo_url ?? specialist.avatar_url ?? null,
      video_url: profile?.video_url ?? null,
      gallery_urls: profile?.gallery_urls ?? [],
      certificate_urls: profile?.certificate_urls ?? [],
      city: profile?.city ?? specialist.city ?? null,
      description: profile?.about_me ?? specialist.description ?? specialist.bio ?? null,
      bio: profile?.about_me ?? specialist.bio ?? null,
      plan_code: typeof plan?.plan_code === "string" ? plan.plan_code : "free",
      plan_status: typeof plan?.plan_status === "string" ? plan.plan_status : "active",
    };

    return jsonNoStore({ data });
  } catch (error: any) {
    console.error('[api/specialists/detail] Unexpected error:', error);
    return jsonNoStore(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
