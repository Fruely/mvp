export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import { dashboardPageStackClass } from "@/components/dashboard/dashboardStyles";
import ChangePasswordForm from "@/components/dashboard/settings/ChangePasswordForm";
import NotificationSettings from "@/components/dashboard/settings/NotificationSettings";
import { Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";
import { getDictionary, resolveRouteLang, t } from "@/lib/i18n";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import { specialistLangHomePath } from "@/lib/specialists/navigation";

export default async function SpecialistDashboardSettingsPage({
  params,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
}) {
  const resolved = await Promise.resolve(params);
  const lang = resolveRouteLang(resolved.lang);
  const dict = await getDictionary(lang);
  const { user, specialist } = await getCurrentUserAndSpecialist();

  if (specialist.status === "blocked") {
    redirect(specialistLangHomePath());
  }

  const email = user.email ?? "";

  return (
    <div className={dashboardPageStackClass}>
      <DashboardPageHeader
        title={t(dict, "dashboard.settingsPage.title")}
        subtitle={t(dict, "dashboard.settingsPage.subtitle")}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t(dict, "dashboard.settingsPage.securityTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-freuly-5">
          <Input id="settings-email" label={t(dict, "dashboard.settingsPage.emailLabel")} value={email} readOnly disabled />
          <ChangePasswordForm email={email} dict={dict} />
        </CardContent>
      </Card>
      <NotificationSettings lang={lang} />
    </div>
  );
}
