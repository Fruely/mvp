import { redirect } from "next/navigation";
import { isSupportedLang } from "@/lib/i18n";

export default function FindPage({
  params,
}: {
  params: { lang: string };
}) {
  const lang = isSupportedLang(params.lang) ? params.lang : "ua";

  redirect(`/${lang}/service-search`);
}
