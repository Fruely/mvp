import { redirect } from "next/navigation";
import { normalizeSearchLangToDbCode } from "@/lib/i18n/normalizeSearchLangToDbCode";

type SearchParams = {
  category?: string;
  city?: string;
  language?: string;
  remote?: string;
};

export default function SearchPage({
  params,
  searchParams,
}: {
  params: { lang: string };
  searchParams: SearchParams;
}) {
  const lang = params.lang;
  const category = searchParams.category?.trim() || null;
  const city = searchParams.city?.trim() || null;
  const languageRaw = searchParams.language?.trim() || null;
  const language = languageRaw
    ? normalizeSearchLangToDbCode(languageRaw) ?? languageRaw
    : "ru";
  const remote = searchParams.remote === "true";

  const qp = new URLSearchParams();
  qp.set("lang", language);
  if (category) qp.set("category", category);

  if (remote) {
    qp.set("mode", "online");
    redirect(`/specialists?${qp.toString()}`);
  }

  if (city) {
    qp.set("place", city);
    redirect(`/specialists?${qp.toString()}`);
  }

  if (category) {
    redirect(`/${lang}/category/${category}?lang=${language}`);
  }

  redirect(`/${lang}`);
}
