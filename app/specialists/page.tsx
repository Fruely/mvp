import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { getCategoryTitle } from "@/lib/getCategoryTitle";
import { normalizeSearchLangToDbCode } from "@/lib/i18n/normalizeSearchLangToDbCode";
import { getDictionary, t, type Dictionary } from "@/lib/i18n";
import { toCategoryTitleLang } from "@/lib/i18n/toCategoryTitleLang";
import { searchSpecialists, type SpecialistResult } from "@/lib/search/specialistSearch";
import { getSearchSuggestions } from "@/lib/search/searchSuggestions";
import { shouldOfferOnlineFallbackForNoLocalResults } from "@/lib/search/noLocalResultsFallback";
import ServiceRequestCtaBlock from "@/components/serviceRequests/ServiceRequestCtaBlock";
import { requestServiceHref } from "@/lib/serviceRequests/requestServiceHref";

export const dynamic = "force-dynamic";

/** Used when `lang` query param is missing (e.g. `/specialists?mode=online`). */
const DEFAULT_SPECIALISTS_SEARCH_LANG = "ru";

const UI_LANGS = ["ua", "ru", "de"] as const;
type UiLang = (typeof UI_LANGS)[number];

function toUiLang(lang: string): UiLang {
  const lower = lang.toLowerCase();
  if (lower === "de") return "de";
  if (lower === "ru") return "ru";
  if (lower === "uk") return "ua";
  return "ua";
}

function serviceSearchHref(uiLang: UiLang): string {
  return `/${uiLang}/service-search`;
}

type SearchParams = {
  lang?: string;
  place?: string;
  q?: string;
  category?: string;
  mode?: string;
  radius?: string;
};

function buildSpecialistsRouteTarget(sp: SearchParams): string {
  const params = new URLSearchParams();
  if (sp.lang?.trim()) params.set("lang", sp.lang.trim());
  if (sp.place?.trim()) params.set("place", sp.place.trim());
  if (sp.q?.trim()) params.set("q", sp.q.trim());
  if (sp.category?.trim()) params.set("category", sp.category.trim());
  if (sp.mode?.trim()) params.set("mode", sp.mode.trim());
  if (sp.radius?.trim()) params.set("radius", sp.radius.trim());
  const qs = params.toString();
  return qs ? `/specialists?${qs}` : "/specialists";
}

/**
 * Query-based link for a no-result suggestion; keeps mode=online / place when
 * present, and preserves radius when the search was a local (place) search.
 */
function buildSuggestionHref(
  lang: string,
  query: string,
  opts: { mode?: string | null; place?: string | null; radius?: string | null }
): string {
  const params = new URLSearchParams();
  params.set("lang", lang);
  params.set("q", query);
  if (opts.mode === "online") params.set("mode", "online");
  if (opts.place?.trim()) {
    params.set("place", opts.place.trim());
    if (opts.radius?.trim()) params.set("radius", opts.radius.trim());
  }
  return `/specialists?${params.toString()}`;
}

function safeSpecialistUrl(lang: string, specialist: { id: string; slug?: string | null }): string {
  const segment = specialist.slug?.trim() || specialist.id;
  return `/${lang}/specialist/${encodeURIComponent(segment)}`;
}

function formatResultsCount(
  dict: Dictionary,
  count: number,
  language: string,
  isOnlineList: boolean
): string {
  const key = isOnlineList
    ? "search.results.countOnline"
    : "search.results.count";
  return t(dict, key)
    .replace("{{count}}", String(count))
    .replace("{{language}}", language);
}

function getInternalBaseUrl(): string {
  const h = headers();
  const host = h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") || "https";
    return `${proto}://${host}`;
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) return siteUrl.replace(/\/$/, "");
  return "http://localhost:3000";
}

function logZeroResultsSpecialistsPage(opts: {
  uiLang: UiLang;
  langParam: string;
  place: string | null;
  routeTarget: string;
  fallback: string | null | undefined;
}) {
  const baseUrl = getInternalBaseUrl();
  const langFilter = normalizeSearchLangToDbCode(opts.langParam) ?? opts.langParam;
  const metadata: Record<string, unknown> = { source: "search_results" };
  if (opts.fallback) metadata.fallback = opts.fallback;

  void fetch(`${baseUrl}/api/search/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      event_type: "zero_results_viewed",
      lang_ui: opts.uiLang,
      lang_filter: langFilter,
      place_query: opts.place,
      results_count: 0,
      had_zero_results: true,
      route_target: opts.routeTarget,
      metadata,
    }),
  }).catch(() => {});
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const lang = searchParams?.lang?.trim() || DEFAULT_SPECIALISTS_SEARCH_LANG;
  const place = searchParams?.place?.trim();
  const mode = searchParams?.mode?.trim().toLowerCase();
  if (mode === "online") {
    return {
      title: "Specialists · online | Freuly",
      description: `Find specialists by language.`,
    };
  }
  if (!place) {
    return { title: "Specialists | Freuly" };
  }
  return {
    title: `Specialists · ${place} | Freuly`,
    description: `Find specialists by language and location.`,
  };
}

export default async function SpecialistsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const lang = searchParams?.lang?.trim() || DEFAULT_SPECIALISTS_SEARCH_LANG;
  const place = searchParams?.place?.trim() || null;
  const q = searchParams?.q?.trim() || null;
  const category = searchParams?.category?.trim() || null;
  const pageMode = searchParams?.mode?.trim().toLowerCase() || null;
  const radiusParam = searchParams?.radius?.trim() || null;
  const isOnlineList = pageMode === "online";
  const uiLang = toUiLang(lang);
  const dict = await getDictionary(uiLang);

  if (!category && !q) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Выберите, какого специалиста вы ищете
          </h1>
          <Link
            href={serviceSearchHref(uiLang)}
            className="inline-block px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
          >
            Назад к поиску
          </Link>
        </div>
      </div>
    );
  }

  if (!isOnlineList && !place && !q) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Missing search parameters
          </h1>
          <p className="text-gray-600 mb-6">
            Language and location are required. Please start your search from the
            homepage.
          </p>
          <Link
            href={serviceSearchHref(uiLang)}
            className="inline-block px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
          >
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  // Direct call — no HTTP roundtrip.
  let result: Awaited<ReturnType<typeof searchSpecialists>>;
  try {
    result = await searchSpecialists({
      lang,
      category,
      q,
      mode: isOnlineList ? "online" : null,
      place: isOnlineList ? null : place,
      // Radius only matters for local (place) searches; ignored by online/all.
      radius: isOnlineList ? null : radiusParam ? Number(radiusParam) : null,
    });
  } catch (error) {
    console.error("[specialists/page] searchSpecialists failed:", error);
    result = { data: [] };
  }

  const specialists: SpecialistResult[] = Array.isArray(result.data) ? result.data : [];
  const searchMode = result.mode;
  const searchRadius = result.radius;

  const empty = specialists.length === 0;

  if (empty) {
    logZeroResultsSpecialistsPage({
      uiLang,
      langParam: lang,
      place,
      routeTarget: buildSpecialistsRouteTarget(searchParams),
      fallback: result.fallback,
    });

    if (result.fallback === "no_local_results" && place) {
      const noLocalSourcePath = `/specialists?${new URLSearchParams(
        Object.entries({
          lang,
          ...(category ? { category } : {}),
          ...(q ? { q } : {}),
          place,
          ...(radiusParam ? { radius: radiusParam } : {}),
        }).filter(([, v]) => v != null && v !== "") as [string, string][],
      ).toString()}`;
      const offerOnlineFallback = shouldOfferOnlineFallbackForNoLocalResults({
        place,
        radius: radiusParam,
      });

      if (!offerOnlineFallback) {
        const findSpecialistHref = requestServiceHref(uiLang, {
          source_path: noLocalSourcePath,
        });
        return (
          <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
            <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-10 text-center">
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-5 py-6 sm:px-6 sm:py-7">
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-2">
                  {t(dict, "search.noLocalResults.titleOffline")}
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mb-5">
                  {t(dict, "search.noLocalResults.subtitleOffline")}
                </p>
                <Link
                  href={findSpecialistHref}
                  className="inline-block w-full sm:w-auto px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-full hover:bg-blue-700 transition"
                >
                  {t(dict, "search.noLocalResults.primaryCta")}
                </Link>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-sm text-gray-600 mb-4">
                  {t(dict, "search.noLocalResults.adjustFiltersTitle")}
                </p>
                <Link
                  href={serviceSearchHref(uiLang)}
                  className="inline-block px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                >
                  {t(dict, "search.noResults.changeFilters")}
                </Link>
              </div>
            </div>
          </div>
        );
      }

      const onlineParams = new URLSearchParams();
      onlineParams.set("mode", "online");
      onlineParams.set("lang", lang);
      if (category) onlineParams.set("category", category);
      if (q) onlineParams.set("q", q);
      const onlineHref = `/specialists?${onlineParams.toString()}`;
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-10 text-center">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-6">
              {t(dict, "search.noLocalResults.titleOnline")}
            </h1>
            <Link
              href={onlineHref}
              className="inline-block px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-full hover:bg-blue-700 transition"
            >
              {t(dict, "search.noLocalResults.showOnlineCta")}
            </Link>
          </div>
        </div>
      );
    }

    const suggestions = q ? getSearchSuggestions({ q, lang: uiLang }) : [];
    const zeroResultsSourcePath = `/specialists?${new URLSearchParams(
      Object.entries({
        lang,
        ...(category ? { category } : {}),
        ...(q ? { q } : {}),
        ...(place ? { place } : {}),
      }).filter(([, v]) => v != null && v !== "") as [string, string][],
    ).toString()}`;
    const findSpecialistHref = requestServiceHref(uiLang, {
      source_path: zeroResultsSourcePath,
    });

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-10 text-center">
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-5 py-6 sm:px-6 sm:py-7">
            <div className="text-2xl mb-3 opacity-40" aria-hidden>
              🔍
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-2">
              {t(dict, "search.noResults.title")}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mb-5">
              {q
                ? t(dict, "search.noResults.serviceSubtitle")
                : t(dict, "search.noResults.subtitle")}
            </p>
            <Link
              href={findSpecialistHref}
              className="inline-block w-full sm:w-auto px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-full hover:bg-blue-700 transition"
            >
              {t(dict, "search.noResults.primaryCta")}
            </Link>
          </div>

          {suggestions.length > 0 && (
            <div className="mt-6 mb-2">
              <p className="text-sm font-medium text-gray-700 mb-3">
                {t(dict, "search.noResults.suggestionsTitle")}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <Link
                    key={s.query}
                    href={buildSuggestionHref(lang, s.query, {
                      mode: pageMode,
                      place,
                      radius: radiusParam,
                    })}
                    className="inline-block px-4 py-2 rounded-full border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-gray-400 transition"
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-600 mb-4">
              {t(dict, "search.noResults.adjustFiltersTitle")}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href={serviceSearchHref(uiLang)}
                className="inline-block px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
              >
                {t(dict, "search.noResults.changeFilters")}
              </Link>
              <Link
                href={serviceSearchHref(uiLang)}
                className="inline-block px-5 py-2.5 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 hover:text-gray-800 transition"
              >
                {t(dict, "search.noResults.backToSearch")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Local rows are the ones the dual-radius search attached a distance to
  // (offline/hybrid within radius). Do not rely on postal_code === place.
  const localSpecialists = specialists.filter(
    (s) => typeof s.distance === "number" && Number.isFinite(s.distance)
  );
  const onlineSpecialists = specialists.filter(
    (s) =>
      !localSpecialists.includes(s) &&
      (s.work_format === "online" || s.work_format === "hybrid")
  );
  const otherSpecialists = specialists.filter(
    (s) => !localSpecialists.includes(s) && !onlineSpecialists.includes(s)
  );

  const renderCard = (s: SpecialistResult) => {
    const categoryLabel =
      getCategoryTitle(
        {
          title: s.category_title,
          title_ru: s.category_title_ru,
          title_de: s.category_title_de,
          title_ua: s.category_title_ua,
        },
        toCategoryTitleLang(uiLang)
      ) || "Category";
    const hasCategory = Boolean(categoryLabel && categoryLabel !== "Category");

    return (
      <li key={s.id}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
          <div className="flex flex-col sm:flex-row gap-5 p-6">
            <div className="flex-shrink-0">
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-gray-100">
                {s.avatar_url ? (
                  <Image
                    src={s.avatar_url}
                    alt={s.name ?? ""}
                    fill
                    sizes="128px"
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div
                    className="absolute inset-0 flex items-center justify-center text-4xl"
                    aria-hidden
                  >
                    👤
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-lg font-bold text-gray-900">{s.name}</h2>
              </div>
              {hasCategory && (
                <p className="text-sm text-gray-500 mt-0.5">{categoryLabel}</p>
              )}
              <p className="text-gray-600 text-sm leading-relaxed mt-2 line-clamp-2">
                {s.bio || t(dict, "search.results.specialistFallbackBio")}
              </p>
              {s.postal_code && (
                <p className="text-xs text-textSecondary mt-2">
                  {s.postal_code}
                  {s.work_format && s.work_format !== "online" && (
                    <span> · {s.work_format}</span>
                  )}
                </p>
              )}
              {typeof s.distance === "number" && Number.isFinite(s.distance) && (
                <p className="text-xs text-textSecondary mt-1">
                  {s.distance} км от вас
                </p>
              )}
              <div className="flex flex-wrap gap-3 mt-4">
                <Link
                  href={`${safeSpecialistUrl(uiLang, s)}?open=form`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl shadow-soft hover:bg-gray-800 transition"
                >
                  {t(dict, "search.results.sendRequest")}
                </Link>
                <Link
                  href={safeSpecialistUrl(uiLang, s)}
                  className="inline-flex items-center gap-1 px-4 py-2 text-gray-700 text-sm font-medium hover:text-gray-900 transition"
                >
                  {t(dict, "search.results.viewProfile")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </li>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href={serviceSearchHref(uiLang)}
            className="text-gray-600 hover:text-gray-900 text-sm font-medium inline-flex items-center gap-1 mb-4"
          >
            ← {t(dict, "search.results.backToSearch")}
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {t(dict, "search.results.title")}
          </h1>
          <p className="text-gray-600 mt-1">
            {formatResultsCount(dict, specialists.length, lang, isOnlineList)}
          </p>
        </div>

        {/* Radius label depends on the returned radius + local results, not on
            searchMode, so it also shows when a query search ran locally
            (mode="query"). */}
        {typeof searchRadius === "number" &&
          Number.isFinite(searchRadius) &&
          localSpecialists.length > 0 && (
            <p className="text-sm text-gray-600 mb-6">
              Найдено специалистов в радиусе {searchRadius} км
            </p>
          )}

        {localSpecialists.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Рядом с вами</h2>
            <ul className="space-y-4 mb-8">
              {localSpecialists.map(renderCard)}
            </ul>
          </>
        )}

        {onlineSpecialists.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              {t(dict, "search.results.onlineSectionTitle")}
            </h2>
            <ul className="space-y-4 mb-8">
              {onlineSpecialists.map(renderCard)}
            </ul>
          </>
        )}

        {otherSpecialists.length > 0 && (
          <ul className="space-y-4">
            {otherSpecialists.map(renderCard)}
          </ul>
        )}

        <ServiceRequestCtaBlock
          lang={uiLang}
          dict={dict}
          variant="fallback"
          sourcePath={`/specialists?${new URLSearchParams(
            Object.entries({
              lang,
              ...(category ? { category } : {}),
              ...(q ? { q } : {}),
              ...(place ? { place } : {}),
            }).filter(([, v]) => v != null && v !== "") as [string, string][],
          ).toString()}`}
        />
      </div>
    </div>
  );
}
