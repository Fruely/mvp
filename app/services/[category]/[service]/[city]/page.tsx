import type { Metadata } from "next";
import ServiceLanding from "@/components/seo/ServiceLanding";
import { getSeoSpecialists } from "@/lib/servicesSeo";
import { featureFlags } from "@/lib/featureFlags";
import { notFound } from "next/navigation";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: { category: string; service: string; city: string };
}): Promise<Metadata> {
  const canonical = `https://freuly.de/services/${encodeURIComponent(params.category)}/${encodeURIComponent(params.service)}/${encodeURIComponent(params.city)}`;
  return {
    title: `${params.service} в ${params.city} | Freuly`,
    description: `Найдите специалистов по услуге ${params.service} в городе ${params.city}.`,
    alternates: { canonical },
  };
}

export default async function ServicesCategoryServiceCityPage({
  params,
}: {
  params: { category: string; service: string; city: string };
}) {
  if (!featureFlags.programmaticSeo) notFound();
  const specialists = await getSeoSpecialists({
    category: params.category,
    service: params.service,
    city: params.city,
  });

  return (
    <ServiceLanding
      title={`${params.service} в ${params.city}`}
      description={`Специалисты по услуге ${params.service} в ${params.city}.`}
      canonicalPath={`/services/${encodeURIComponent(params.category)}/${encodeURIComponent(params.service)}/${encodeURIComponent(params.city)}`}
      specialists={specialists}
    />
  );
}
