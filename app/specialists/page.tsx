import { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { normalizeSearchLangToDbCode } from "@/lib/i18n/normalizeSearchLangToDbCode";
import { getDictionary, t, type Dictionary } from "@/lib/i18n";
import { searchSpecialists, type SpecialistResult } from "@/lib/search/specialistSearch";
import { getSearchSuggestions } from "@/lib/search/searchSuggestions";
import { shouldOfferOnlineFallbackForNoLocalResults } from "@/lib/search/noLocalResultsFallback";
import ServiceRequestCtaBlock from "@/components/serviceRequests/ServiceRequestCtaBlock";
import SpecialistResultCard from "@/components/public/SpecialistResultCard";
import {
  publicLinkPrimaryClass,
  publicLinkSecondaryClass,
  publicPageContainerClass,
  publicSectionTitleClass,
} from "@/components/public/publicStyles";
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
      <div className="bg-freuly-page py-freuly-10 flex flex-col items-center justify-center px-4">
        <div className="max-w-lg w-full rounded-freuly-card border border-freuly-border-default bg-freuly-surface shadow-[0_4px_12px_rgba(0,0,0,0.05)] p-10 text-center">
          <h1 className="text-2xl font-bold text-freuly-text-primary mb-4">
            Выберите, какого специалиста вы ищете
          </h1>
          <Link
            href={serviceSearchHref(uiLang)}
            className={publicLinkPrimaryClass}
          >
            Назад к поиску
          </Link>
        </div>
      </div>
    );
  }

  if (!isOnlineList && !place && !q) {
    return (
      <div className="bg-freuly-page py-freuly-10 flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full rounded-freuly-card border border-freuly-border-default bg-freuly-surface shadow-[0_4px_12px_rgba(0,0,0,0.05)] p-8 text-center">
          <h1 className="text-xl font-bold text-freuly-text-primary mb-2">
            Missing search parameters
          </h1>
          <p className="text-freuly-text-secondary mb-6">
            Language and location are required. Please start your search from the
            homepage.
          </p>
          <Link
            href={serviceSearchHref(uiLang)}
            className={publicLinkPrimaryClass}
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
          <div className="bg-freuly-page py-freuly-10 flex flex-col items-center justify-center px-4">
            <div className="max-w-lg w-full rounded-freuly-card border border-freuly-border-default bg-freuly-surface shadow-[0_4px_12px_rgba(0,0,0,0.05)] p-8 sm:p-10 text-center">
              <div className="rounded-xl border border-freuly-primary/20 bg-freuly-primary-light/50 px-5 py-6 sm:px-6 sm:py-7">
                <h1 className="text-xl sm:text-2xl font-semibold text-freuly-text-secondary mb-2">
                  {t(dict, "search.noLocalResults.titleOffline")}
                </h1>
                <p className="text-sm sm:text-base text-freuly-text-secondary mb-5">
                  {t(dict, "search.noLocalResults.subtitleOffline")}
                </p>
                <Link
                  href={findSpecialistHref}
                  className={`${publicLinkPrimaryClass} w-full sm:w-auto rounded-full`}
                >
                  {t(dict, "search.noLocalResults.primaryCta")}
                </Link>
              </div>
              <div className="mt-6 pt-6 border-t border-freuly-border-subtle">
                <p className="text-sm text-freuly-text-secondary mb-4">
                  {t(dict, "search.noLocalResults.adjustFiltersTitle")}
                </p>
                <Link
                  href={serviceSearchHref(uiLang)}
                  className="inline-block px-5 py-2.5 border border-freuly-border-default text-freuly-text-secondary text-sm font-medium rounded-lg hover:bg-freuly-border-subtle transition"
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
        <div className="bg-freuly-page py-freuly-10 flex flex-col items-center justify-center px-4">
          <div className="max-w-lg w-full rounded-freuly-card border border-freuly-border-default bg-freuly-surface shadow-[0_4px_12px_rgba(0,0,0,0.05)] p-8 sm:p-10 text-center">
            <h1 className="text-xl sm:text-2xl font-semibold text-freuly-text-secondary mb-6">
              {t(dict, "search.noLocalResults.titleOnline")}
            </h1>
            <Link
              href={onlineHref}
              className={`${publicLinkPrimaryClass} rounded-full`}
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
      <div className="bg-freuly-page py-freuly-10 flex flex-col items-center justify-center px-4">
        <div className="max-w-lg w-full rounded-freuly-card border border-freuly-border-default bg-freuly-surface shadow-[0_4px_12px_rgba(0,0,0,0.05)] p-8 sm:p-10 text-center">
          <div className="rounded-xl border border-freuly-primary/20 bg-freuly-primary-light/50 px-5 py-6 sm:px-6 sm:py-7">
            <div className="text-2xl mb-3 opacity-40" aria-hidden>
              🔍
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-freuly-text-secondary mb-2">
              {t(dict, "search.noResults.title")}
            </h1>
            <p className="text-sm sm:text-base text-freuly-text-secondary mb-5">
              {q
                ? t(dict, "search.noResults.serviceSubtitle")
                : t(dict, "search.noResults.subtitle")}
            </p>
            <Link
              href={findSpecialistHref}
              className={`${publicLinkPrimaryClass} w-full sm:w-auto rounded-full`}
            >
              {t(dict, "search.noResults.primaryCta")}
            </Link>
          </div>

          {suggestions.length > 0 && (
            <div className="mt-6 mb-2">
              <p className="text-sm font-medium text-freuly-text-secondary mb-3">
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
                    className="inline-block px-4 py-2 rounded-full border border-freuly-border-default text-freuly-text-secondary text-sm font-medium hover:bg-freuly-border-subtle hover:border-gray-400 transition"
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-freuly-border-subtle">
            <p className="text-sm text-freuly-text-secondary mb-4">
              {t(dict, "search.noResults.adjustFiltersTitle")}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href={serviceSearchHref(uiLang)}
                className="inline-block px-5 py-2.5 border border-freuly-border-default text-freuly-text-secondary text-sm font-medium rounded-lg hover:bg-freuly-border-subtle transition"
              >
                {t(dict, "search.noResults.changeFilters")}
              </Link>
              <Link
                href={serviceSearchHref(uiLang)}
                className="inline-block px-5 py-2.5 text-freuly-text-secondary text-sm font-medium rounded-lg hover:bg-freuly-border-subtle hover:text-gray-800 transition"
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

  const renderCard = (s: SpecialistResult) => (
    <li key={s.id}>
      <SpecialistResultCard
        specialist={s}
        lang={uiLang}
        dict={dict}
        profileHref={safeSpecialistUrl(uiLang, s)}
        leadHref={`${safeSpecialistUrl(uiLang, s)}?open=form`}
      />
    </li>
  );

  return (
    <div className="bg-freuly-page py-freuly-10">
      <div className={`${publicPageContainerClass} max-w-4xl`}>
        <div className="mb-freuly-8">
          <Link
            href={serviceSearchHref(uiLang)}
            className="mb-freuly-4 inline-flex items-center gap-1 text-sm font-medium text-freuly-text-secondary transition hover:text-freuly-text-primary"
          >
            ← {t(dict, "search.results.backToSearch")}
          </Link>
          <h1 className={publicSectionTitleClass}>{t(dict, "search.results.title")}</h1>
          <p className="mt-1 text-freuly-body text-freuly-text-secondary">
            {formatResultsCount(dict, specialists.length, lang, isOnlineList)}
          </p>
        </div>

        {/* Radius label depends on the returned radius + local results, not on
            searchMode, so it also shows when a query search ran locally
            (mode="query"). */}
        {typeof searchRadius === "number" &&
          Number.isFinite(searchRadius) &&
          localSpecialists.length > 0 && (
            <p className="mb-freuly-6 text-sm text-freuly-text-secondary">
              Найдено специалистов в радиусе {searchRadius} км
            </p>
          )}

        {localSpecialists.length > 0 && (
          <>
            <h2 className="mb-freuly-3 text-lg font-semibold text-freuly-text-primary">Рядом с вами</h2>
            <ul className="mb-freuly-8 space-y-freuly-4">
              {localSpecialists.map(renderCard)}
            </ul>
          </>
        )}

        {onlineSpecialists.length > 0 && (
          <>
            <h2 className="mb-freuly-3 text-lg font-semibold text-freuly-text-primary">
              {t(dict, "search.results.onlineSectionTitle")}
            </h2>
            <ul className="mb-freuly-8 space-y-freuly-4">
              {onlineSpecialists.map(renderCard)}
            </ul>
          </>
        )}

        {otherSpecialists.length > 0 && (
          <ul className="space-y-freuly-4">
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
