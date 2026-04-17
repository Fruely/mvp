export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import { notify } from "@/lib/notifications/notify";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { isPublicationReadyForDashboard } from "@/lib/dashboard/publicationReadiness";
import { getDictionary, isSupportedLang, t, type Dictionary } from "@/lib/i18n";
import { specialistLangHomePath } from "@/lib/specialists/navigation";
import VerificationBanner from "./VerificationBanner";

export default async function SpecialistDashboardHomePage({
  params,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
}) {
  const resolved = await Promise.resolve(params);
  const lang = isSupportedLang(resolved.lang) ? resolved.lang : "ru";
  const { specialist } = await getCurrentUserAndSpecialist();
  const service = createServiceClient();

  const dict: Dictionary = await getDictionary(lang);

  const status = specialist.status;

  if (status === "blocked") {
    redirect(specialistLangHomePath());
  }

  const { data: visitCheck } = await service
    .from("specialists")
    .select("first_dashboard_visit_at")
    .eq("id", specialist.id)
    .maybeSingle();

  if (!visitCheck?.first_dashboard_visit_at) {
    await service
      .from("specialists")
      .update({
        first_dashboard_visit_at: new Date().toISOString(),
      })
      .eq("id", specialist.id);

    await notify("NEW_SPECIALIST", {
      name: `🟡 Зашёл в кабинет: ${specialist.name || "Без имени"}`,
    });
  }

  const { data: specExtra } = await service
    .from("specialists")
    .select("postal_code, work_format, languages")
    .eq("id", specialist.id)
    .maybeSingle();

  const categoryId =
    typeof (specialist as unknown as Record<string, unknown>).category_id === "string"
      ? ((specialist as unknown as Record<string, unknown>).category_id as string)
      : "";

  const { data: categoryRow } = await service
    .from("categories")
    .select("parent_id")
    .eq("id", categoryId)
    .maybeSingle();

  const categoryParentId =
    categoryRow && typeof categoryRow.parent_id === "string" ? categoryRow.parent_id : null;

  const { data: servicesRows } = await service
    .from("specialist_services")
    .select("title, price_from, is_active, category_id")
    .eq("specialist_id", specialist.id)
    .eq("is_active", true);

  const servicesInCategory = (servicesRows ?? []).filter(
    (row) => typeof row.category_id === "string" && row.category_id === categoryId,
  );

  const name = specialist.first_name?.trim() || specialist.name?.trim() || "";
  const languages = Array.isArray(specExtra?.languages)
    ? (specExtra.languages as unknown[]).filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      )
    : [];
  const workFormat =
    specExtra?.work_format === "online" ||
    specExtra?.work_format === "offline" ||
    specExtra?.work_format === "hybrid"
      ? String(specExtra.work_format)
      : "online";
  const postalCode = typeof specExtra?.postal_code === "string" ? specExtra.postal_code : "";

  const profileReadyForPublish = isPublicationReadyForDashboard({
    name,
    categoryId,
    categoryParentId,
    languages,
    workFormat,
    postalCode,
    servicesInSelectedCategory: servicesInCategory,
  });

  const profileHref = `/${lang}/specialist/dashboard/profile`;

  return (
    <div className="space-y-6">
      <VerificationBanner status={status} dict={dict} />

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">{t(dict, "dashboard.home.title")}</h1>
        <p className="mt-2 text-sm text-gray-600">{t(dict, "dashboard.home.subtitle")}</p>

        <div
          className={`mt-6 rounded-lg border px-4 py-4 text-sm ${
            profileReadyForPublish
              ? "border-emerald-200 bg-emerald-50/80 text-emerald-950"
              : "border-amber-200 bg-amber-50/80 text-amber-950"
          }`}
        >
          <p className="font-medium">{t(dict, "dashboard.home.statusLabel")}</p>
          <p className="mt-1 text-gray-800">
            {profileReadyForPublish ? t(dict, "dashboard.home.readyBody") : t(dict, "dashboard.home.incompleteBody")}
          </p>
          <Link
            href={profileHref}
            className={`mt-4 inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-semibold text-white transition ${
              profileReadyForPublish
                ? "bg-teal-600 hover:bg-teal-700"
                : "bg-orange-500 hover:bg-orange-600"
            }`}
          >
            {profileReadyForPublish ? t(dict, "dashboard.home.editProfile") : t(dict, "dashboard.home.completeProfile")}
          </Link>
        </div>
      </section>
    </div>
  );
}
