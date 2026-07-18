import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SUPPORTED_LANGS = ["ua", "ru", "de"] as const;
const LANG_COOKIE = "freuly_lang";

export default async function PartnersRootRedirect() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LANG_COOKIE)?.value ?? "";
  const lang = (SUPPORTED_LANGS as readonly string[]).includes(raw) ? raw : "ua";
  redirect(`/${lang}/partners`);
}
