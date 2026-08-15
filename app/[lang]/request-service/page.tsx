import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import { publicPageContainerClass, publicPageStackClass } from "@/components/public/publicStyles";
import ServiceRequestForm from "@/components/serviceRequests/ServiceRequestForm";
import { getDictionary, isSupportedLang, t, type Lang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const WORK_FORMATS = ["online", "offline", "hybrid"] as const;

function readParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string | null {
  const value = searchParams[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readWorkFormat(value: string | null): (typeof WORK_FORMATS)[number] | null {
  if (!value) return null;
  return (WORK_FORMATS as readonly string[]).includes(value)
    ? (value as (typeof WORK_FORMATS)[number])
    : null;
}

function readPreferredLanguage(value: string | null): Lang | null {
  if (value === "ua" || value === "ru" || value === "de") return value;
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const lang = isSupportedLang(params.lang) ? params.lang : "ua";
  const dict = await getDictionary(lang);
  const title =
    lang === "de"
      ? "Aufgabe beschreiben | Freuly"
      : lang === "ru"
        ? "Описать задачу | Freuly"
        : "Описати завдання | Freuly";
  return {
    title,
    description: String((dict as Record<string, unknown>).serviceRequest
      ? (dict as { serviceRequest?: { subtitle?: string } }).serviceRequest?.subtitle
      : ""),
    robots: { index: false, follow: false },
  };
}

export default async function RequestServicePage({
  params,
  searchParams,
}: {
  params: { lang: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (!isSupportedLang(params.lang)) {
    notFound();
  }
  const lang = params.lang as Lang;

  const dict = await getDictionary(lang);

  return (
    <div className={`${publicPageStackClass} py-freuly-10`}>
      <div className={publicPageContainerClass}>
        <DashboardPageHeader
          title={t(dict, "serviceRequest.title")}
          subtitle={t(dict, "serviceRequest.subtitle")}
          className="mb-freuly-8 max-w-3xl"
        />
        <ServiceRequestForm
          lang={lang}
          initialCategoryId={readParam(searchParams, "category_id")}
          initialCategoryText={readParam(searchParams, "category_text")}
          sourcePath={readParam(searchParams, "source_path")}
          initialQuery={readParam(searchParams, "q")}
          initialPlace={readParam(searchParams, "place")}
          initialPreferredLanguage={readPreferredLanguage(readParam(searchParams, "preferred_language"))}
          initialWorkFormat={readWorkFormat(readParam(searchParams, "work_format"))}
          initialRadiusKm={readParam(searchParams, "radius_km")}
        />
      </div>
    </div>
  );
}
