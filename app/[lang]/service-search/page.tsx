import { isSupportedLang, type Lang } from "@/lib/i18n";
import ServiceSearchFlow, {
  SERVICE_SEARCH_FLOW_TEXT,
} from "@/components/search-flow/ServiceSearchFlow";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: { lang: string } }) {
  const lang: Lang = isSupportedLang(params.lang) ? params.lang : "ua";
  const text = SERVICE_SEARCH_FLOW_TEXT[lang];

  return {
    title: `${text.headline} | Freuly`,
    description: text.description,
  };
}

export default function ServiceSearchPage({
  params,
}: {
  params: { lang: string };
}) {
  const lang: Lang = isSupportedLang(params.lang) ? params.lang : "ua";

  return <ServiceSearchFlow text={SERVICE_SEARCH_FLOW_TEXT[lang]} />;
}
