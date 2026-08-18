import { createSupabaseServerClient } from "@/lib/supabase/server";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";
import { getCategoryTitle } from "@/lib/getCategoryTitle";
import { toCategoryTitleLang } from "@/lib/i18n/toCategoryTitleLang";
import {
  resolveProfileContent,
  resolveServiceContent,
  toContentLocale,
} from "@/lib/localization";

export type PublicSpecialistProfile = {
  id: string;
  slug: string | null;
  name: string | null;
  description: string | null;
  city: string | null;
  postalCode: string | null;
  workFormat: string | null;
  categoryTitle: string | null;
  languages: string[];
  avatarUrl: string | null;
  createdAt: string;
  services: Array<{
    id: string;
    title: string | null;
    price_from: number | null;
    price_to: number | null;
    currency: string | null;
    price_comment: string | null;
    pricing_exception: "THIRD_PARTY_FUNDED" | "AFTER_ASSESSMENT" | null;
    pricing_type: "fixed" | "range" | "hourly" | null;
  }>;
};

const isUuid = (identifier: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(identifier);

export async function getPublicSpecialistProfile(
  identifier: string,
  lang: "ru" | "ua" | "de"
): Promise<PublicSpecialistProfile | null> {
  const supabase = createSupabaseServerClient();

  let resolvedId = identifier;
  if (!isUuid(identifier)) {
    const { data: slugRow, error: slugError } = await supabase
      .from("specialists")
      .select("id")
      .eq("slug", identifier)
      .maybeSingle();

    if (slugError || !slugRow?.id) {
      return null;
    }

    resolvedId = slugRow.id;
  }

  const { data: specialist, error: specialistError } = await supabase
    .from("specialists")
    .select(
      "id, slug, name, avatar_url, category_id, status, is_active, is_visible, billing_visibility_blocked, languages, created_at, work_format, postal_code"
    )
    .eq("id", resolvedId)
    .maybeSingle();

  if (
    specialistError ||
    !specialist ||
    !specialist.is_active ||
    !specialist.is_visible ||
    specialist.billing_visibility_blocked === true ||
    !(VISIBLE_PUBLIC_SPECIALIST_STATUSES as readonly string[]).includes(specialist.status ?? "")
  ) {
    return null;
  }

  const { data: profile } = await supabase
    .from("specialist_profiles")
    .select("about_me, city")
    .eq("specialist_id", specialist.id)
    .maybeSingle();

  const { data: category } = specialist.category_id
    ? await supabase
        .from("categories")
        .select("title, title_ru, title_de, title_ua")
        .eq("id", specialist.category_id)
        .maybeSingle()
    : { data: null };

  const { data: services } = await supabase
    .from("specialist_services")
    .select("id, title, price_from, price_to, currency, is_active, price_comment, pricing_exception, pricing_type")
    .eq("specialist_id", specialist.id)
    .eq("is_active", true);

  const locale = toContentLocale(lang);
  const serviceIds = (services ?? [])
    .map((service) => (service?.id != null ? String(service.id) : null))
    .filter((id): id is string => Boolean(id));
  const [profileContentById, serviceContentById] = locale
    ? await Promise.all([
        resolveProfileContent(supabase, {
          specialistIds: [String(specialist.id)],
          locale,
        }).catch((error) => {
          console.error(
            "[specialists/publicProfile] profile localization resolve failed",
            error
          );
          return null;
        }),
        resolveServiceContent(supabase, {
          serviceIds,
          locale,
        }).catch((error) => {
          console.error(
            "[specialists/publicProfile] service localization resolve failed",
            error
          );
          return null;
        }),
      ])
    : [null, null];
  const description =
    profileContentById?.get(String(specialist.id))?.aboutMe ??
    profile?.about_me ??
    null;

  return {
    id: specialist.id,
    slug: specialist.slug ?? null,
    name: specialist.name ?? null,
    description,
    city: profile?.city ?? null,
    postalCode: typeof specialist.postal_code === "string" ? specialist.postal_code : null,
    workFormat: typeof specialist.work_format === "string" ? specialist.work_format : null,
    categoryTitle:
      category && getCategoryTitle(category, toCategoryTitleLang(lang))
        ? getCategoryTitle(category, toCategoryTitleLang(lang))
        : category?.title ?? null,
    languages: Array.isArray(specialist.languages) ? specialist.languages : [],
    avatarUrl: specialist.avatar_url ?? null,
    createdAt: specialist.created_at ?? new Date(0).toISOString(),
    services: Array.isArray(services)
      ? services.map((service) => {
          const serviceId = String(service.id);
          const localized = serviceContentById?.get(serviceId);
          return {
            id: service.id,
            title: localized?.title ?? service.title ?? null,
            price_from: service.price_from ?? null,
            price_to: service.price_to ?? null,
            currency: service.currency ?? null,
            price_comment: localized?.priceComment ?? (typeof service.price_comment === "string" ? service.price_comment : null),
            pricing_exception:
              service.pricing_exception === "THIRD_PARTY_FUNDED" ||
              service.pricing_exception === "AFTER_ASSESSMENT"
                ? service.pricing_exception
                : null,
            pricing_type:
              service.pricing_type === "fixed" ||
              service.pricing_type === "range" ||
              service.pricing_type === "hourly"
                ? service.pricing_type
                : null,
          };
        })
      : [],
  };
}
