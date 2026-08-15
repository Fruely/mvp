import { cookies } from "next/headers";
import { langFromCookie, type Lang } from "@/lib/i18n";

function getPreferredLang(): Lang {
  const langCookie = cookies().get("freuly_lang")?.value;
  return langFromCookie(langCookie);
}

export function specialistLangHomePath(): string {
  return `/${getPreferredLang()}`;
}

export function specialistLangBecomePath(): string {
  return `/${getPreferredLang()}/become-specialist`;
}

/** Server (uses cookie): base path or e.g. `leads` → `/{lang}/specialist/dashboard/leads` */
export function specialistDashboardPath(subpath?: string): string {
  const lang = getPreferredLang();
  const base = `/${lang}/specialist/dashboard`;
  if (!subpath) return base;
  const clean = subpath.replace(/^\/+/, "");
  return `${base}/${clean}`;
}
