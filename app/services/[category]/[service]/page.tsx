import type { Metadata } from "next";
import ServiceLanding from "@/components/seo/ServiceLanding";
import { getSeoSpecialists } from "@/lib/servicesSeo";
import { featureFlags } from "@/lib/featureFlags";
import { notFound } from "next/navigation";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: { category: string; service: string };
}): Promise<Metadata> {
  const title = `${params.service} в категории ${params.category} | Freuly`;
  const canonical = `https://freuly.de/services/${encodeURIComponent(params.category)}/${encodeURIComponent(params.service)}`;
  return {
    title,
    description: `Подбор специалистов по услуге ${params.service}.`,
    alternates: { canonical },
  };
}

export default async function ServicesCategoryServicePage({
  params,
}: {
  params: { category: string; service: string };
}) {
  if (!featureFlags.programmaticSeo) notFound();
  const specialists = await getSeoSpecialists({
    category: params.category,
    service: params.service,
  });

  return (
    <ServiceLanding
      title={`${params.service} — ${params.category}`}
      description={`Специалисты по услуге ${params.service}.`}
      canonicalPath={`/services/${encodeURIComponent(params.category)}/${encodeURIComponent(params.service)}`}
      specialists={specialists}
    />
  );
}
