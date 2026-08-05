import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, isSupportedLang, type Lang } from "@/lib/i18n";
import ServiceRequestForm from "@/components/serviceRequests/ServiceRequestForm";

export const dynamic = "force-dynamic";

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

export default function RequestServicePage({
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
  const category_id =
    typeof searchParams.category_id === "string" ? searchParams.category_id : null;
  const category_text =
    typeof searchParams.category_text === "string" ? searchParams.category_text : null;
  const source_path =
    typeof searchParams.source_path === "string" ? searchParams.source_path : null;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <ServiceRequestForm
        lang={lang}
        initialCategoryId={category_id}
        initialCategoryText={category_text}
        sourcePath={source_path}
      />
    </div>
  );
}
