export const dynamic = "force-dynamic";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";
import {
  resolveProfileContent,
  resolveServiceContent,
  toContentLocale,
} from "@/lib/localization";
import { getSpecialistPlanForDashboard } from "@/lib/specialists/subscription";
import {
  normalizeGalleryUrls,
  resolveSpecialistEntitlements,
  selectPublicGalleryUrls,
} from "@/lib/billing/planEntitlements";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";
import { resolvePublicSpecialistId } from "@/lib/specialists/publicProfile";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const url = new URL(request.url);
  const languageCode = toContentLocale(url.searchParams.get("lang"));

  const param = params.id;
  if (!param) {
    return jsonNoStore({ error: "Missing specialist id" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const resolvedId = await resolvePublicSpecialistId(param);
  if (!resolvedId) {
    return jsonNoStore({ error: "Specialist not found" }, { status: 404 });
  }

  const { data: specialist, error: specError } = await supabase
    .from("specialists")
    .select(
      "id, slug, name, avatar_url, category_id, status, is_active, is_visible, billing_visibility_blocked, is_test, languages, work_format, created_at, lat, lng, founder_badge"
    )
    .eq("id", resolvedId)
    .maybeSingle();

  if (specError) {
    console.error("[specialists/[id]] fetch specialist failed", specError);
    return jsonNoStore({ error: "Internal server error" }, { status: 500 });
  }

  if (
    !specialist ||
    !specialist.is_active ||
    !specialist.is_visible ||
    specialist.billing_visibility_blocked === true ||
    specialist.is_test === true ||
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
    .select("id, title, price_from, price_to, currency, is_active, price_comment, pricing_exception, pricing_type")
    .eq("specialist_id", specialist.id)
    .eq("is_active", true);

  const { data: ratingRow } = await supabase
    .from("specialist_rating_stats")
    .select("rating_avg, reviews_count")
    .eq("specialist_id", specialist.id)
    .maybeSingle();

  const serviceIds = (services ?? [])
    .map((service) => (service?.id != null ? String(service.id) : null))
    .filter((id): id is string => Boolean(id));
  const [profileContentById, serviceContentById] = languageCode
    ? await Promise.all([
        resolveProfileContent(supabase, {
          specialistIds: [String(specialist.id)],
          locale: languageCode,
        }).catch((error) => {
          console.error(
            "[specialists/[id]] profile localization resolve failed",
            error
          );
          return null;
        }),
        resolveServiceContent(supabase, {
          serviceIds,
          locale: languageCode,
        }).catch((error) => {
          console.error(
            "[specialists/[id]] service localization resolve failed",
            error
          );
          return null;
        }),
      ])
    : [null, null];
  const descriptionResolved =
    profileContentById?.get(String(specialist.id))?.aboutMe ??
    profile?.about_me ??
    null;

  const plan = await getSpecialistPlanForDashboard(supabase, specialist.id);
  const entitlements = resolveSpecialistEntitlements(plan);
  const allGalleryUrls = normalizeGalleryUrls(profile?.gallery_urls);

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
    gallery_urls: selectPublicGalleryUrls(allGalleryUrls, entitlements.galleryPublicLimit),
    certificate_urls: Array.isArray(profile?.certificate_urls) ? profile.certificate_urls : [],
    photo_url: profile?.photo_url ?? null,
    lat: specialist.lat ?? null,
    lng: specialist.lng ?? null,
    founder_badge: specialist.founder_badge === true,
    plan_code: plan.plan_code,
    plan_status: plan.plan_status,
    rating: ratingRow?.rating_avg ?? null,
    reviews_count: ratingRow?.reviews_count ?? 0,
    specialist_services: (services ?? []).map((s) => {
      const sid = s?.id != null ? String(s.id) : "";
      const localized = sid ? serviceContentById?.get(sid) : null;
      const legacyTitle = s.title;
      const legacyPriceComment =
        s.price_comment != null && String(s.price_comment).trim()
          ? String(s.price_comment).trim()
          : null;
      const titleResolved = localized?.title ?? legacyTitle;
      const priceCommentResolved =
        localized?.resolvedFrom.priceComment === "translation"
          ? localized.priceComment
          : legacyPriceComment;
      return {
        id: s.id,
        title: titleResolved,
        price_from: s.price_from,
        price_to: s.price_to,
        currency: s.currency ?? "EUR",
        price_comment: priceCommentResolved,
        pricing_exception:
          s.pricing_exception === "THIRD_PARTY_FUNDED" || s.pricing_exception === "AFTER_ASSESSMENT"
            ? s.pricing_exception
            : null,
        pricing_type:
          s.pricing_type === "fixed" || s.pricing_type === "range" || s.pricing_type === "hourly"
            ? s.pricing_type
            : null,
      };
    }),
  };

  return jsonNoStore({ data: result });
}
