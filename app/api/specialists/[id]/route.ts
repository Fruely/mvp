export const dynamic = "force-dynamic";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  if (!id) {
    return jsonNoStore({ error: "Missing specialist id" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  const { data: specialist, error: specError } = await supabase
    .from("specialists")
    .select(
      "id, slug, name, avatar_url, category_id, status, is_active, is_visible, languages, work_format, created_at, user_id, lat, lng"
    )
    .eq("id", id)
    .maybeSingle();

  if (specError) {
    return jsonNoStore({ error: "Failed to fetch specialist" }, { status: 500 });
  }

  if (
    !specialist ||
    !specialist.is_active ||
    !specialist.is_visible ||
    !(VISIBLE_PUBLIC_SPECIALIST_STATUSES as readonly string[]).includes(specialist.status ?? "")
  ) {
    return jsonNoStore({ error: "Specialist not found" }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("specialist_profiles")
    .select(
      "photo_url, video_url, gallery_urls, certificate_urls, about_me, city, address"
    )
    .eq("specialist_id", id)
    .maybeSingle();

  const { data: category } = specialist.category_id
    ? await supabase
        .from("categories")
        .select("title, slug")
        .eq("id", specialist.category_id)
        .maybeSingle()
    : { data: null };

  const { data: services } = await supabase
    .from("specialist_services")
    .select("id, title, price_from, price_to, currency, is_active")
    .eq("specialist_id", id)
    .eq("is_active", true);

  const { data: ratingRow } = await supabase
    .from("specialist_rating_stats")
    .select("rating_avg, reviews_count")
    .eq("specialist_id", id)
    .maybeSingle();

  const result = {
    id: specialist.id,
    slug: specialist.slug,
    name: specialist.name,
    avatar_url: specialist.avatar_url,
    category: category?.title ?? null,
    category_id: specialist.category_id,
    category_slug: category?.slug ?? null,
    languages: specialist.languages ?? [],
    work_format: specialist.work_format,
    created_at: specialist.created_at,
    user_id: specialist.user_id,
    city: profile?.city ?? null,
    address: profile?.address ?? null,
    description: profile?.about_me ?? null,
    video_url: profile?.video_url ?? null,
    gallery_urls: Array.isArray(profile?.gallery_urls) ? profile.gallery_urls : [],
    certificate_urls: Array.isArray(profile?.certificate_urls) ? profile.certificate_urls : [],
    photo_url: profile?.photo_url ?? null,
    lat: specialist.lat ?? null,
    lng: specialist.lng ?? null,
    rating: ratingRow?.rating_avg ?? null,
    reviews_count: ratingRow?.reviews_count ?? 0,
    specialist_services: (services ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      price_from: s.price_from,
      price_to: s.price_to,
      currency: s.currency ?? "EUR",
    })),
  };

  return jsonNoStore({ data: result });
}
