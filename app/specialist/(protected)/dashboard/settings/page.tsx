export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import ChangePasswordForm from "@/components/dashboard/settings/ChangePasswordForm";
import { specialistLangHomePath } from "@/lib/specialists/navigation";

export default async function SpecialistDashboardSettingsPage() {
  const { user, specialist } = await getCurrentUserAndSpecialist();

  if (specialist.status === "blocked") {
    redirect(specialistLangHomePath());
  }

  const email = user.email ?? "";

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Настройки</h1>
        <p className="mt-1 text-sm text-gray-500">
          Управляйте безопасностью аккаунта и параметрами доступа.
        </p>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Безопасность</h2>
        <div className="mt-4 grid gap-2">
          <p className="text-sm font-medium text-gray-700">Email</p>
          <input
            value={email}
            readOnly
            className="h-10 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm text-gray-700"
          />
        </div>

        <div className="mt-5">
          <ChangePasswordForm email={email} />
        </div>
      </section>
    </div>
  );
}

