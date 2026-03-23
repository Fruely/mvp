import type { Metadata } from "next";
import ServiceLanding from "@/components/seo/ServiceLanding";
import { getSeoSpecialists } from "@/lib/servicesSeo";
import { featureFlags } from "@/lib/featureFlags";
import { notFound } from "next/navigation";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: { category: string };
}): Promise<Metadata> {
  const title = `${params.category} специалисты | Freuly`;
  const canonical = `https://freuly.de/services/${encodeURIComponent(params.category)}`;
  return {
    title,
    description: `Подбор специалистов по категории ${params.category}.`,
    alternates: { canonical },
  };
}

export default async function ServicesCategoryPage({
  params,
}: {
  params: { category: string };
}) {
  if (!featureFlags.programmaticSeo) notFound();
  const specialists = await getSeoSpecialists({ category: params.category });
  const title = `Услуги: ${params.category}`;
  const description = `Каталог специалистов по категории ${params.category}.`;
  return (
    <ServiceLanding
      title={title}
      description={description}
      canonicalPath={`/services/${encodeURIComponent(params.category)}`}
      specialists={specialists}
    />
  );
}
