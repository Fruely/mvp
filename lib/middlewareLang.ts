import { langFromCookie, type Lang } from "@/lib/i18n";
import { resolveSpecialistsUiLang } from "@/lib/search/specialistsUiLang";

/** Legacy `/specialist/dashboard` → `/{lang}/specialist/dashboard…` */
export function legacySpecialistDashboardPath(
  cookieLang: string | undefined | null,
  rest = "",
): string {
  const lang: Lang = langFromCookie(cookieLang);
  return `/${lang}/specialist/dashboard${rest}`;
}

/** PWA `/app` shell html lang resolution. */
export function resolveAppShellLang(cookieLang: string | undefined | null): Lang {
  return langFromCookie(cookieLang);
}

/** Unprefixed `/specialists` UI lang: query → cookie → default ru. */
export function resolveSpecialistsMiddlewareLang(input: {
  queryLang?: string | null;
  cookieLang?: string | null;
}): Lang {
  return resolveSpecialistsUiLang({
    queryLang: input.queryLang,
    cookieLang: input.cookieLang,
  });
}

/** Unprefixed route redirect when no URL lang prefix is present. */
export function resolveUnprefixedRedirectLang(cookieLang: string | undefined | null): Lang {
  return langFromCookie(cookieLang);
}
