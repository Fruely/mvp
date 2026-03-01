export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import SetPasswordBlock from "./SetPasswordBlock";
import LogoutButton from "./LogoutButton";
import KpiCards from "@/components/dashboard/KpiCards";
import RecentLeads from "@/components/dashboard/RecentLeads";
import SubscriptionCard from "@/components/dashboard/SubscriptionCard";
import ProfileCompletion from "@/components/dashboard/ProfileCompletion";
import { getDashboardData } from "@/lib/dashboard/getDashboardData";
import { isContactsLocked } from "@/lib/dashboard/isContactsLocked";

export default async function SpecialistDashboardPage() {
  const { supabase, user, specialist } = await getCurrentUserAndSpecialist();

  const status = specialist.status;

  if (status !== "approved" && status !== "paused") {
    redirect("/specialist/claim/invalid?reason=status");
  }

  const { data: profile } = await supabase
    .from("specialist_profiles")
    .select(
      "photo_url, video_url, gallery_urls, certificate_urls, about_me, services, how_i_work, experience, city, radius_km, categories"
    )
    .eq("specialist_id", specialist.id)
    .maybeSingle();

  const dashboardData = await getDashboardData(supabase, specialist.id);
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

      <KpiCards
        newCount={dashboardData.counts.new}
        contactedCount={dashboardData.counts.contacted}
        closedCount={dashboardData.counts.closed}
        totalLast30Days={dashboardData.totalLast30Days}
      />

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
