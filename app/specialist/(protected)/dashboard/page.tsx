export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import SetPasswordBlock from "./SetPasswordBlock";
import LogoutButton from "./LogoutButton";
import KpiCards from "@/components/dashboard/KpiCards";
import LeadsChart from "@/components/dashboard/LeadsChart";
import RecentLeads from "@/components/dashboard/RecentLeads";
import SubscriptionCard from "@/components/dashboard/SubscriptionCard";
import ProfileCompletion from "@/components/dashboard/ProfileCompletion";
import ProfilePublicationStatus from "@/components/dashboard/ProfilePublicationStatus";
import { getDashboardData } from "@/lib/dashboard/getDashboardData";
import { isContactsLocked } from "@/lib/dashboard/isContactsLocked";
import type { PublicationService } from "@/lib/dashboard/isProfilePublished";
import { featureFlags } from "@/lib/featureFlags";
import SpecialistDashboardEditor from "./SpecialistDashboardEditor";
import { specialistLangHomePath } from "@/lib/specialists/navigation";

export default async function SpecialistDashboardPage() {
  const { supabase, user, specialist } = await getCurrentUserAndSpecialist();

  const status = specialist.status;

  if (status === "blocked") {
    redirect(specialistLangHomePath());
  }

  if (featureFlags.newSpecialistDashboard) {
    const { data: profile } = await supabase
      .from("specialist_profiles")
      .select("photo_url, about_me, city, gallery_urls, video_url")
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
          city: typeof profile?.city === "string" ? profile.city : "",
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
    );
  }

  const { data: profile } = await supabase
    .from("specialist_profiles")
    .select(
      "photo_url, video_url, gallery_urls, certificate_urls, about_me, services, how_i_work, experience, city, radius_km, categories"
    )
    .eq("specialist_id", specialist.id)
    .maybeSingle();

  const dashboardData = await getDashboardData(supabase, specialist.id);
  const { data: services } = await supabase
    .from("specialist_services")
    .select("id, pricing_type, price_from, price_to, is_active")
    .eq("specialist_id", specialist.id);
  const publicationServices: PublicationService[] = (services ?? []).map((service) => ({
    is_active: Boolean(service.is_active),
    pricing_type:
      service.pricing_type === "fixed" || service.pricing_type === "range" || service.pricing_type === "hourly"
        ? service.pricing_type
        : null,
    price_from: typeof service.price_from === "number" ? service.price_from : null,
    price_to: typeof service.price_to === "number" ? service.price_to : null,
  }));
  const firstName = specialist.first_name?.trim() || specialist.name?.trim() || "";
  const specialistRecord = specialist as unknown as Record<string, unknown>;
  const subscriptionStatus =
    typeof specialistRecord.subscription_status === "string" && specialistRecord.subscription_status.trim()
      ? specialistRecord.subscription_status.trim()
      : "—";
  const planName =
    typeof specialistRecord.plan_name === "string" && specialistRecord.plan_name.trim()
      ? specialistRecord.plan_name.trim()
      : "—";
  const subscriptionUntil =
    typeof specialistRecord.subscription_until === "string" && specialistRecord.subscription_until.trim()
      ? specialistRecord.subscription_until
      : null;
  const graceUntil =
    typeof specialistRecord.grace_until === "string" && specialistRecord.grace_until.trim()
      ? specialistRecord.grace_until
      : null;
  const contactsLocked = isContactsLocked(subscriptionStatus);

  const showSetPassword = !specialist.password_set_at;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Панель управления
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Добро пожаловать{firstName ? `, ${firstName}` : ""}. Ключевые показатели и последние заявки.
          </p>
        </div>
        <div className="shrink-0">
          <LogoutButton />
        </div>
      </div>

      {showSetPassword ? <SetPasswordBlock /> : null}

      <ProfilePublicationStatus services={publicationServices} />

      <KpiCards
        newCount={dashboardData.counts.new}
        contactedCount={dashboardData.counts.contacted}
        closedCount={dashboardData.counts.closed}
        totalLast30Days={dashboardData.totalLast30Days}
      />

      <LeadsChart data={dashboardData.activityByDay} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RecentLeads leads={dashboardData.leadsRecent} contactsLocked={contactsLocked} />
        </div>
        <div className="space-y-6">
          <SubscriptionCard
            status={subscriptionStatus}
            planName={planName}
            subscriptionUntil={subscriptionUntil}
            graceUntil={graceUntil}
          />
          <ProfileCompletion
            profile={{
              photo_url: (profile?.photo_url as string | null) ?? null,
              about_me: (profile?.about_me as string | null) ?? null,
              services: (profile?.services as string | null) ?? null,
              categories: (profile?.categories as string[] | null) ?? null,
              city: (profile?.city as string | null) ?? null,
              radius_km: (profile?.radius_km as number | null) ?? null,
              video_url: (profile?.video_url as string | null) ?? null,
              gallery_urls: (profile?.gallery_urls as string[] | null) ?? null,
              certificate_urls: (profile?.certificate_urls as string[] | null) ?? null,
            }}
          />
        </div>
      </div>

      <footer className="py-2 text-sm text-gray-500">
        Есть вопросы? Напишите нам:{" "}
        <a
          href="mailto:ihfo@freuly.de"
          className="font-medium text-emerald-600 hover:text-emerald-700"
        >
          ihfo@freuly.de
        </a>
      </footer>
    </div>
  );
}
