import { createSupabaseServerClient } from "@/lib/supabase/server";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";

export type SeoSpecialistCard = {
  id: string;
  slug: string | null;
  name: string | null;
  city: string | null;
  avatar_url: string | null;
  languages: string[];
  services: string[];
};

export async function getSeoSpecialists(params: {
  category: string;
  service?: string;
  city?: string;
  language?: string;
}): Promise<SeoSpecialistCard[]> {
  const supabase = createSupabaseServerClient();

  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", params.category)
    .maybeSingle();
  if (!category?.id) return [];

  const { data: specialists } = await supabase
    .from("specialists")
    .select("id, slug, name, city, avatar_url, languages")
    .eq("category_id", category.id)
    .in("status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
    .eq("is_active", true)
    .eq("is_visible", true)
    .limit(120);

  const specialistRows = specialists ?? [];
  if (specialistRows.length === 0) return [];

  const specialistIds = specialistRows.map((s) => s.id);
  const { data: servicesRows } = await supabase
    .from("specialist_services")
    .select("specialist_id, title, service_slug, city_slug, language_slug, is_active")
    .in("specialist_id", specialistIds)
    .eq("is_active", true);

  const servicesBySpecialist = new Map<string, Array<{
    title: string | null;
    service_slug: string | null;
    city_slug: string | null;
    language_slug: string | null;
  }>>();

  for (const row of servicesRows ?? []) {
    const list = servicesBySpecialist.get(String(row.specialist_id)) ?? [];
    list.push({
      title: typeof row.title === "string" ? row.title : null,
      service_slug: typeof row.service_slug === "string" ? row.service_slug : null,
      city_slug: typeof row.city_slug === "string" ? row.city_slug : null,
      language_slug: typeof row.language_slug === "string" ? row.language_slug : null,
    });
    servicesBySpecialist.set(String(row.specialist_id), list);
  }

  const normalizedService = params.service?.trim().toLowerCase();
  const normalizedCity = params.city?.trim().toLowerCase();
  const normalizedLanguage = params.language?.trim().toLowerCase();

  return specialistRows
    .filter((specialist) => {
      const langList = Array.isArray(specialist.languages)
        ? specialist.languages
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.toLowerCase())
        : [];
      if (normalizedLanguage && !langList.some((item) => item.includes(normalizedLanguage))) {
        return false;
      }
      if (normalizedCity) {
        const city = typeof specialist.city === "string" ? specialist.city.toLowerCase() : "";
        if (!city.includes(normalizedCity)) return false;
      }
      const specialistServices = servicesBySpecialist.get(String(specialist.id)) ?? [];
      if (!normalizedService) return specialistServices.length > 0;
      return specialistServices.some((service) => {
        const slug = service.service_slug?.toLowerCase() ?? "";
        const title = service.title?.toLowerCase() ?? "";
        return slug === normalizedService || title.includes(normalizedService);
      });
    })
    .map((specialist) => {
      const specialistServices = servicesBySpecialist.get(String(specialist.id)) ?? [];
      return {
        id: String(specialist.id),
        slug: typeof specialist.slug === "string" ? specialist.slug : null,
        name: typeof specialist.name === "string" ? specialist.name : null,
        city: typeof specialist.city === "string" ? specialist.city : null,
        avatar_url: typeof specialist.avatar_url === "string" ? specialist.avatar_url : null,
        languages: Array.isArray(specialist.languages)
          ? specialist.languages.filter((item): item is string => typeof item === "string")
          : [],
        services: specialistServices
          .map((service) => service.title)
          .filter((title): title is string => Boolean(title)),
      };
    })
    .slice(0, 60);
}
