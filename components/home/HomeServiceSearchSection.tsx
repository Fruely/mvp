"use client";

import { useSearchParams } from "next/navigation";
import ServiceSearchFlow from "@/components/search-flow/ServiceSearchFlow";
import { SERVICE_SEARCH_FLOW_TEXT } from "@/lib/search/serviceSearchFlowText";
import type { Lang } from "@/lib/i18n";

export default function HomeServiceSearchSection({
  lang,
  className,
}: {
  lang: Lang;
  className?: string;
}) {
  const searchParams = useSearchParams();
  const placeFromUrl = searchParams?.get("place")?.trim() ?? "";

  return (
    <ServiceSearchFlow
      variant="home"
      text={SERVICE_SEARCH_FLOW_TEXT[lang]}
      defaultLanguage={lang}
      initialLocation={placeFromUrl}
      className={className}
    />
  );
}
