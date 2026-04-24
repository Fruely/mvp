export const dynamic = "force-dynamic";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";

/** Query ?lang= route segment → specialist_*_translations.language_code */
function normalizeRouteLangToDbCode(routeLang: string | null): string | null {
  if (routeLang == null || typeof routeLang !== "string") return null;
  const lower = routeLang.trim().toLowerCase();
  if (lower === "ua") return "uk";
  if (lower === "ru") return "ru";
  if (lower === "de") return "de";
  return null;
}

function nonEmptyTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const url = new URL(request.url);
  const languageCode = normalizeRouteLangToDbCode(url.searchParams.get("lang"));

  const param = params.id;
  if (!param) {
    return jsonNoStore({ error: "Missing specialist id" }, { status: 400 });
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(param);

  const supabase = createSupabaseServerClient();

  const { data: specialist, error: specError } = await supabase
    .from("specialists")
    .select(
      "id, slug, name, avatar_url, category_id, status, is_active, is_visible, languages, work_format, created_at, lat, lng, founder_badge"
    )
    .eq(isUuid ? "id" : "slug", param)
    .maybeSingle();

  if (specError) {
    console.error("[specialists/[id]] fetch specialist failed", specError);
    return jsonNoStore({ error: "Internal server error" }, { status: 500 });
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
    .eq("specialist_id", specialist.id)
    .maybeSingle();

  const { data: category } = specialist.category_id
    ? await supabase
        .from("categories")
        .select("title, title_ru, title_de, title_ua, slug")
        .eq("id", specialist.category_id)
        .maybeSingle()
    : { data: null };

  const { data: services } = await supabase
    .from("specialist_services")
    .select("id, title, price_from, price_to, currency, is_active, price_comment")
    .eq("specialist_id", specialist.id)
    .eq("is_active", true);

  const { data: ratingRow } = await supabase
    .from("specialist_rating_stats")
    .select("rating_avg, reviews_count")
    .eq("specialist_id", specialist.id)
    .maybeSingle();

  let profileTranslationAbout: string | null | undefined;
  const serviceTranslationById = new Map<
    string,
    { title: string | null; price_comment: string | null }
  >();

  if (languageCode) {
    const { data: profileTrans } = await supabase
      .from("specialist_profile_translations")
      .select("about_me")
      .eq("specialist_id", specialist.id)
      .eq("language_code", languageCode)
      .maybeSingle();
    profileTranslationAbout = profileTrans?.about_me;

    const serviceIds = (services ?? [])
      .map((s) => (s?.id != null ? String(s.id) : null))
      .filter((id): id is string => Boolean(id));

    if (serviceIds.length > 0) {
      const { data: serviceTransRows } = await supabase
        .from("specialist_service_translations")
        .select("specialist_service_id, title, price_comment")
        .eq("language_code", languageCode)
        .in("specialist_service_id", serviceIds);

      for (const row of serviceTransRows ?? []) {
        const sid = row?.specialist_service_id != null ? String(row.specialist_service_id) : null;
        if (!sid) continue;
        serviceTranslationById.set(sid, {
          title: row.title != null && typeof row.title === "string" ? row.title : null,
          price_comment:
            row.price_comment != null && typeof row.price_comment === "string"
              ? row.price_comment
              : null,
        });
      }
    }
  }

  const descriptionResolved =
    languageCode != null
      ? nonEmptyTrimmedString(profileTranslationAbout) ?? (profile?.about_me ?? null)
      : profile?.about_me ?? null;

  const result = {
    id: specialist.id,
    slug: specialist.slug,
    name: specialist.name,
    avatar_url: specialist.avatar_url,
    category: category?.title ?? null,
    category_title_ru: category?.title_ru ?? null,
    category_title_de: category?.title_de ?? null,
    category_title_ua: category?.title_ua ?? null,
    category_id: specialist.category_id,
    category_slug: category?.slug ?? null,
    languages: specialist.languages ?? [],
    work_format: specialist.work_format,
    created_at: specialist.created_at,
    city: profile?.city ?? null,
    address: profile?.address ?? null,
    description: descriptionResolved,
    video_url: profile?.video_url ?? null,
    gallery_urls: Array.isArray(profile?.gallery_urls) ? profile.gallery_urls : [],
    certificate_urls: Array.isArray(profile?.certificate_urls) ? profile.certificate_urls : [],
    photo_url: profile?.photo_url ?? null,
    lat: specialist.lat ?? null,
    lng: specialist.lng ?? null,
    founder_badge: specialist.founder_badge === true,
    rating: ratingRow?.rating_avg ?? null,
    reviews_count: ratingRow?.reviews_count ?? 0,
    specialist_services: (services ?? []).map((s) => {
      const sid = s?.id != null ? String(s.id) : "";
      const tr = sid ? serviceTranslationById.get(sid) : undefined;
      const legacyTitle = s.title;
      const legacyPriceComment =
        s.price_comment != null && String(s.price_comment).trim()
          ? String(s.price_comment).trim()
          : null;
      const titleResolved = nonEmptyTrimmedString(tr?.title) ?? legacyTitle;
      const priceCommentResolved =
        nonEmptyTrimmedString(tr?.price_comment) ?? legacyPriceComment;
      return {
        id: s.id,
        title: titleResolved,
        price_from: s.price_from,
        price_to: s.price_to,
        currency: s.currency ?? "EUR",
        price_comment: priceCommentResolved,
      };
    }),
  };

  return jsonNoStore({ data: result });
}
