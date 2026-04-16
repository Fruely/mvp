export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import ServicesTable from "@/components/dashboard/ServicesTable";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import type { SpecialistService } from "@/lib/dashboard/services";
import { specialistLangHomePath } from "@/lib/specialists/navigation";
import { isSupportedLang } from "@/lib/i18n";

export default async function SpecialistDashboardServicesPage({
  params,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
}) {
  const resolved = await Promise.resolve(params);
  const lang = isSupportedLang(resolved.lang) ? resolved.lang : "ru";
  const { specialist } = await getCurrentUserAndSpecialist();
  const service = createServiceClient();

  if (specialist.status === "blocked") {
    redirect(specialistLangHomePath());
  }

  const { data, error } = await service
    .from("specialist_services")
    .select(
      "id, title, description, pricing_type, price_from, price_to, currency, duration_minutes, is_active, created_at, updated_at"
    )
    .eq("specialist_id", specialist.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[dashboard/services] failed to load services", error);
  }

  const services: SpecialistService[] = (data ?? []).map((row) => ({
    id: String(row.id),
    title: typeof row.title === "string" ? row.title : "",
    description: typeof row.description === "string" ? row.description : null,
    pricing_type:
      row.pricing_type === "fixed" || row.pricing_type === "range" || row.pricing_type === "hourly"
        ? row.pricing_type
        : "fixed",
    price_from: typeof row.price_from === "number" ? row.price_from : 0,
    price_to: typeof row.price_to === "number" ? row.price_to : null,
    currency: typeof row.currency === "string" && row.currency.trim() ? row.currency : "EUR",
    duration_minutes:
      typeof row.duration_minutes === "number" && Number.isFinite(row.duration_minutes)
        ? row.duration_minutes
        : null,
    is_active: Boolean(row.is_active),
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
  }));

  return <ServicesTable initialServices={services} lang={lang} />;
}
