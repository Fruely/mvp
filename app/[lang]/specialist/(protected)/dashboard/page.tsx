export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import { getDictionary, isSupportedLang, t } from "@/lib/i18n";
import { specialistLangHomePath } from "@/lib/specialists/navigation";
import InstallFreuly from "@/components/pwa/InstallFreuly";
import VerificationBanner from "./VerificationBanner";
import OverviewStatsSection from "./OverviewStatsSection";
import OverviewStatsSkeleton from "./OverviewStatsSkeleton";
import DraftDemandChannelDashboard from "./DraftDemandChannelDashboard";

export default async function SpecialistDashboardHomePage({
  params,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
}) {
  const resolved = await Promise.resolve(params);
  const lang = isSupportedLang(resolved.lang) ? resolved.lang : "ru";
  const [{ specialist }, dict] = await Promise.all([
    getCurrentUserAndSpecialist(),
    getDictionary(lang),
  ]);

  const status = specialist.status;

  if (status === "blocked") {
    redirect(specialistLangHomePath());
  }

  const isDraft = !status || status === "draft";

  if (isDraft) {
    return (
      <div className="space-y-freuly-8">
        <InstallFreuly
          lang={lang}
          audience="specialist"
          placement="dashboard"
          variant="dashboard"
        />
        <DraftDemandChannelDashboard specialist={specialist} lang={lang} />
      </div>
    );
  }

  return (
    <div className="space-y-freuly-8">
      <VerificationBanner status={status} dict={dict} />
      <InstallFreuly
        lang={lang}
        audience="specialist"
        placement="dashboard"
        variant="dashboard"
      />

      <header className="flex flex-col gap-1.5">
        <h1 className="text-freuly-page-title text-freuly-text-primary">
          {t(dict, "dashboard.home.title")}
        </h1>
        <p className="text-freuly-page-subtitle text-freuly-text-secondary">
          {t(dict, "dashboard.home.subtitle")}
        </p>
      </header>

      <Suspense fallback={<OverviewStatsSkeleton />}>
        <OverviewStatsSection specialist={specialist} lang={lang} dict={dict} status={status} />
      </Suspense>
    </div>
  );
}
