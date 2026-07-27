export const LOCALE_REGISTRY = {
  ru: {
    contentLocale: "ru",
    routeLocale: "ru",
    aliases: ["ru"],
    providers: { deepl: "RU" },
  },
  uk: {
    contentLocale: "uk",
    routeLocale: "ua",
    aliases: ["uk", "ua"],
    providers: { deepl: "UK" },
  },
  de: {
    contentLocale: "de",
    routeLocale: "de",
    aliases: ["de"],
    providers: { deepl: "DE" },
  },
} as const;

export type ContentLocale = keyof typeof LOCALE_REGISTRY;
export type RouteLocale =
  (typeof LOCALE_REGISTRY)[ContentLocale]["routeLocale"];
export type TranslationProvider = keyof
  (typeof LOCALE_REGISTRY)[ContentLocale]["providers"];

const contentLocaleByAlias = new Map<string, ContentLocale>(
  (Object.keys(LOCALE_REGISTRY) as ContentLocale[]).flatMap((contentLocale) =>
    LOCALE_REGISTRY[contentLocale].aliases.map(
      (alias) => [alias, contentLocale] as const
    )
  )
);

export function toContentLocale(
  locale: string | null | undefined
): ContentLocale | null {
  if (typeof locale !== "string") return null;
  const normalized = locale.trim().toLowerCase();
  if (!normalized) return null;
  return contentLocaleByAlias.get(normalized) ?? null;
}

export function toRouteLocale(locale: ContentLocale): RouteLocale {
  return LOCALE_REGISTRY[locale].routeLocale;
}

export function toProviderLocale(
  locale: ContentLocale,
  provider: TranslationProvider
): string {
  return LOCALE_REGISTRY[locale].providers[provider];
}
