import { redirect } from "next/navigation";

type UiLang = "ru" | "ua" | "de";

type SearchParams = {
  category?: string;
  city?: string;
  language?: string;
  remote?: string;
};

function toUiLang(lang: string | undefined): UiLang {
  const lower = lang?.trim().toLowerCase();
  if (lower === "ru" || lower === "ua" || lower === "de") return lower;
  return "ru";
}

function isRemoteTruthy(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "true" ||
    normalized === "1" ||
    normalized === "yes" ||
    normalized === "on"
  );
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
  searchParams: SearchParams | Promise<SearchParams>;
}) {
  const { lang: langParam } = await Promise.resolve(params);
  const sp = await Promise.resolve(searchParams);

  const uiLang = toUiLang(langParam);
  const category = sp.category?.trim() || null;
  const city = sp.city?.trim() || null;
  const searchLang = sp.language?.trim() || uiLang;
  const remote = isRemoteTruthy(sp.remote);

  if (category && remote) {
    const qp = new URLSearchParams();
    qp.set("lang", searchLang);
    qp.set("category", category);
    qp.set("mode", "online");
    redirect(`/specialists?${qp.toString()}`);
  }

  if (category && city) {
    const qp = new URLSearchParams();
    qp.set("lang", searchLang);
    qp.set("category", category);
    qp.set("place", city);
    redirect(`/specialists?${qp.toString()}`);
  }

  if (category) {
    const qp = new URLSearchParams();
    qp.set("lang", searchLang);
    redirect(`/${uiLang}/category/${encodeURIComponent(category)}?${qp.toString()}`);
  }

  redirect(`/${uiLang}`);
}
