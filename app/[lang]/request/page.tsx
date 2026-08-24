import { redirect } from "next/navigation";
import { isSupportedLang } from "@/lib/i18n";

function toQueryString(searchParams: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      query.append(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) query.append(key, item);
    }
  }

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export default function RequestPage({
  params,
  searchParams,
}: {
  params: { lang: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const lang = isSupportedLang(params.lang) ? params.lang : "ua";

  redirect(`/${lang}/request-service${toQueryString(searchParams)}`);
}
