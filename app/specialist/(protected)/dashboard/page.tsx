export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import SpecialistDashboardEditor from "./SpecialistDashboardEditor";
import { specialistLangHomePath } from "@/lib/specialists/navigation";
import VerificationBanner from "./VerificationBanner";

export default async function SpecialistDashboardPage() {
  const { supabase, user, specialist } = await getCurrentUserAndSpecialist();

  const status = specialist.status;

  if (status === "blocked") {
    redirect(specialistLangHomePath());
  }

  const { data: specExtra } = await supabase
    .from("specialists")
    .select("postal_code")
    .eq("id", specialist.id)
    .maybeSingle();
  const { data: profile } = await supabase
    .from("specialist_profiles")
    .select("photo_url, about_me, city, address, gallery_urls, video_url")
    .eq("specialist_id", specialist.id)
    .maybeSingle();
  const { data: servicesRows } = await supabase
    .from("specialist_services")
    .select("id, title, price_from, currency, is_active")
    .eq("specialist_id", specialist.id)
    .order("created_at", { ascending: false });
  const { data: categoriesRows } = await supabase
    .from("categories")
    .select("id, title")
    .order("title", { ascending: true });

  return (
    <div className="space-y-6">
      <VerificationBanner status={status} />
      <SpecialistDashboardEditor
        initialStatus={status || "draft"}
        initialData={{
          name: specialist.first_name?.trim() || specialist.name?.trim() || "",
          email: specialist.email || "",
          phone: specialist.phone || "",
          category_id:
            typeof (specialist as unknown as Record<string, unknown>).category_id === "string"
              ? ((specialist as unknown as Record<string, unknown>).category_id as string)
              : "",
          work_format:
            typeof (specialist as unknown as Record<string, unknown>).work_format === "string" &&
            ((specialist as unknown as Record<string, unknown>).work_format === "online" ||
              (specialist as unknown as Record<string, unknown>).work_format === "offline" ||
              (specialist as unknown as Record<string, unknown>).work_format === "hybrid")
              ? ((specialist as unknown as Record<string, unknown>).work_format as "online" | "offline" | "hybrid")
              : "online",
          languages: Array.isArray((specialist as unknown as Record<string, unknown>).languages)
            ? ((specialist as unknown as Record<string, unknown>).languages as unknown[])
                .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
            : [],
          about_me: typeof profile?.about_me === "string" ? profile.about_me : "",
          video_url: typeof profile?.video_url === "string" ? profile.video_url : "",
          postal_code: typeof specExtra?.postal_code === "string" ? specExtra.postal_code : "",
          city: typeof profile?.city === "string" ? profile.city : "",
          address: typeof profile?.address === "string" ? profile.address : "",
          photo_url: typeof profile?.photo_url === "string" ? profile.photo_url : "",
          gallery_urls: Array.isArray(profile?.gallery_urls)
            ? profile.gallery_urls.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
            : [],
          services: (servicesRows ?? []).map((service) => ({
            id: String(service.id),
            title: typeof service.title === "string" ? service.title : "",
            price_from:
              typeof service.price_from === "number" && Number.isFinite(service.price_from)
                ? String(service.price_from)
                : "",
            currency: typeof service.currency === "string" && service.currency.trim() ? service.currency : "EUR",
            is_active: Boolean(service.is_active),
          })),
        }}
        categories={(categoriesRows ?? [])
          .filter((category): category is { id: string; title: string } => typeof category?.id === "string" && typeof category?.title === "string")
          .map((category) => ({ id: category.id, title: category.title }))}
      />
    </div>
  );
}
