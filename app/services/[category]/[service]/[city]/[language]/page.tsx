import type { Metadata } from "next";
import ServiceLanding from "@/components/seo/ServiceLanding";
import { getSeoSpecialists } from "@/lib/servicesSeo";
import { featureFlags } from "@/lib/featureFlags";
import { notFound } from "next/navigation";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: { category: string; service: string; city: string; language: string };
}): Promise<Metadata> {
  const canonical = `https://freuly.de/services/${encodeURIComponent(params.category)}/${encodeURIComponent(params.service)}/${encodeURIComponent(params.city)}/${encodeURIComponent(params.language)}`;
  return {
    title: `${params.service}, ${params.city}, язык ${params.language} | Freuly`,
    description: `Специалисты по услуге ${params.service} в городе ${params.city} с языком ${params.language}.`,
    alternates: { canonical },
  };
}

export default async function ServicesCategoryServiceCityLanguagePage({
  params,
}: {
  params: { category: string; service: string; city: string; language: string };
}) {
  if (!featureFlags.programmaticSeo) notFound();
  const specialists = await getSeoSpecialists({
    category: params.category,
    service: params.service,
    city: params.city,
    language: params.language,
  });

  return (
    <ServiceLanding
      title={`${params.service} в ${params.city} (${params.language})`}
      description={`Подбор специалистов по услуге ${params.service} в ${params.city} на языке ${params.language}.`}
      canonicalPath={`/services/${encodeURIComponent(params.category)}/${encodeURIComponent(params.service)}/${encodeURIComponent(params.city)}/${encodeURIComponent(params.language)}`}
      specialists={specialists}
    />
  );
}
