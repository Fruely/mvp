import { cookies } from "next/headers";
import { isSupportedLang, type Lang } from "@/lib/i18n";

function getPreferredLang(): Lang {
  const langCookie = cookies().get("freuly_lang")?.value;
  if (langCookie && isSupportedLang(langCookie)) return langCookie;
  return "ua";
}

export function specialistLangHomePath(): string {
  return `/${getPreferredLang()}`;
}

export function specialistLangBecomePath(): string {
  return `/${getPreferredLang()}/become-specialist`;
}
