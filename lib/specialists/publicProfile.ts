import { createSupabaseServerClient } from "@/lib/supabase/server";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";
import { getCategoryTitle } from "@/lib/getCategoryTitle";
import { toCategoryTitleLang } from "@/lib/i18n/toCategoryTitleLang";

export type PublicSpecialistProfile = {
  id: string;
  slug: string | null;
  name: string | null;
  description: string | null;
  city: string | null;
  categoryTitle: string | null;
  languages: string[];
  avatarUrl: string | null;
  services: Array<{
    id: string;
    title: string | null;
    price_from: number | null;
    price_to: number | null;
    currency: string | null;
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
      "id, slug, name, avatar_url, category_id, status, is_active, is_visible, languages"
    )
    .eq("id", resolvedId)
    .maybeSingle();

  if (
    specialistError ||
    !specialist ||
    !specialist.is_active ||
    !specialist.is_visible ||
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
    .select("id, title, price_from, price_to, currency, is_active")
    .eq("specialist_id", specialist.id)
    .eq("is_active", true);

  return {
    id: specialist.id,
    slug: specialist.slug ?? null,
    name: specialist.name ?? null,
    description: profile?.about_me ?? null,
    city: profile?.city ?? null,
    categoryTitle:
      category && getCategoryTitle(category, toCategoryTitleLang(lang))
        ? getCategoryTitle(category, toCategoryTitleLang(lang))
        : category?.title ?? null,
    languages: Array.isArray(specialist.languages) ? specialist.languages : [],
    avatarUrl: specialist.avatar_url ?? null,
    services: Array.isArray(services)
      ? services.map((service) => ({
          id: service.id,
          title: service.title ?? null,
          price_from: service.price_from ?? null,
          price_to: service.price_to ?? null,
          currency: service.currency ?? null,
        }))
      : [],
  };
}
