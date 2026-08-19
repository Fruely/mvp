import { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect, permanentRedirect } from "next/navigation";
import { DEFAULT_LANG } from "@/lib/i18n";
import { normalizeSearchLangToDbCode } from "@/lib/i18n/normalizeSearchLangToDbCode";
import { getDictionary, t, tCount, type Dictionary, type Lang } from "@/lib/i18n";
import { searchSpecialists, type SpecialistResult } from "@/lib/search/specialistSearch";
import { getSearchSuggestions } from "@/lib/search/searchSuggestions";
import { shouldOfferOnlineFallbackForNoLocalResults } from "@/lib/search/noLocalResultsFallback";
import { parseSearchContext, searchContextToAssistedPrefill } from "@/lib/search/searchContext";
import { assistedPrefillToRequestHref } from "@/lib/serviceRequests/requestServiceHref";
import { categorySlugForCanonicalSearch, getCategoryUrl, getSpecialistUrl } from "@/lib/publicUrls";
import { resolveCategoryAsciiSlug } from "@/lib/categories/resolvePublicCategorySlug";
import ServiceRequestCtaBlock from "@/components/serviceRequests/ServiceRequestCtaBlock";
import AssistedMatchingContinuation from "@/components/public/AssistedMatchingContinuation";
import SpecialistResultCard from "@/components/public/SpecialistResultCard";
import { publicPageContainerClass } from "@/components/public/publicStyles";

export const dynamic = "force-dynamic";

/** Used when `lang` query param is missing (e.g. `/specialists?mode=online`). */
const DEFAULT_SPECIALISTS_SEARCH_LANG = DEFAULT_LANG;

const UI_LANGS = ["ua", "ru", "de"] as const;
type UiLang = (typeof UI_LANGS)[number];

function toUiLang(lang: string): UiLang {
  const lower = lang.toLowerCase();
  if (lower === "de") return "de";
  if (lower === "ru") return "ru";
  if (lower === "uk") return "ua";
  return DEFAULT_LANG;
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
 * Query-based link for a related search; keeps mode=online / place when
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
  return getSpecialistUrl(lang, specialist);
}

function formatResultsCount(
  dict: Dictionary,
  count: number,
  language: string,
  uiLang: Lang,
  isOnlineList: boolean
): string {
  const key = isOnlineList
    ? "search.results.countOnline"
    : "search.results.count";
  return tCount(dict, uiLang, key, count, { language });
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
  let canonicalCategorySlug = categorySlugForCanonicalSearch({
    category,
    q,
    place,
    mode: pageMode,
  });
  if (!canonicalCategorySlug && category && !q && !place && !pageMode) {
    canonicalCategorySlug = await resolveCategoryAsciiSlug(category);
  }
  if (canonicalCategorySlug) {
    permanentRedirect(getCategoryUrl(uiLang, canonicalCategorySlug));
  }

  const dict = await getDictionary(uiLang);
  const searchContext = parseSearchContext(searchParams);
  const assistedPrefill = searchContextToAssistedPrefill(searchContext);
  const assistedHref = assistedPrefillToRequestHref(uiLang, assistedPrefill);

  if (!category && !q) {
    redirect(serviceSearchHref(uiLang));
  }

  if (!isOnlineList && !place && !q && !category) {
    redirect(serviceSearchHref(uiLang));
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

    const suggestions = q ? getSearchSuggestions({ q, lang: uiLang }) : [];

    let secondaryHref: string | null = null;
    if (result.fallback === "no_local_results" && place) {
      const offerOnlineFallback = shouldOfferOnlineFallbackForNoLocalResults({
        place,
        radius: radiusParam,
      });
      if (offerOnlineFallback) {
        const onlineParams = new URLSearchParams();
        onlineParams.set("mode", "online");
        onlineParams.set("lang", lang);
        if (category) onlineParams.set("category", category);
        if (q) onlineParams.set("q", q);
        secondaryHref = `/specialists?${onlineParams.toString()}`;
      }
    }

    return (
      <AssistedMatchingContinuation
        backHref={serviceSearchHref(uiLang)}
        backLabel={t(dict, "search.results.backToSearch")}
        pageTitle={t(dict, "search.results.title")}
        title={t(dict, "search.assistedMatching.title")}
        subtitle={t(dict, "search.assistedMatching.subtitle")}
        primaryHref={assistedHref}
        primaryLabel={t(dict, "search.assistedMatching.primaryCta")}
        secondaryHref={secondaryHref}
        secondaryLabel={
          secondaryHref ? t(dict, "search.assistedMatching.secondaryOnlineCta") : null
        }
        refineHref={serviceSearchHref(uiLang)}
        refineLabel={t(dict, "search.assistedMatching.refineSearch")}
        extra={
          suggestions.length > 0 ? (
            <div className="mt-6 text-center">
              <p className="mb-3 text-sm font-medium text-freuly-text-secondary">
                {t(dict, "search.assistedMatching.relatedTitle")}
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
                    className="inline-block rounded-full border border-freuly-border-default px-4 py-2 text-sm font-medium text-freuly-text-secondary transition hover:border-freuly-primary/40 hover:bg-freuly-primary-light"
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null
        }
      />
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

  const resultsCountLine = [
    formatResultsCount(dict, specialists.length, lang, uiLang, isOnlineList),
    typeof searchRadius === "number" &&
    Number.isFinite(searchRadius) &&
    localSpecialists.length > 0
      ? t(dict, "search.results.radiusHint").replace("{{radius}}", String(searchRadius))
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="bg-freuly-page py-6 sm:py-12">
      <div className={publicPageContainerClass}>
        <div className="mb-8 flex flex-col gap-4">
          <Link
            href={serviceSearchHref(uiLang)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-freuly-primary hover:text-freuly-primary-hover"
          >
            <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0" aria-hidden>
              <path
                d="M7.5 2.5 3.5 6l4 3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t(dict, "search.results.backToSearch")}
          </Link>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[24px] font-bold leading-tight text-freuly-text-primary sm:text-[28px]">
              {t(dict, "search.results.title")}
            </h1>
            <p className="text-sm text-freuly-text-secondary">{resultsCountLine}</p>
          </div>
        </div>

        {localSpecialists.length > 0 && (
          <>
            <h2 className="mb-4 text-sm font-semibold text-freuly-text-primary">
              {t(dict, "search.results.nearbySectionTitle")}
            </h2>
            <ul className="mb-8 space-y-4">
              {localSpecialists.map(renderCard)}
            </ul>
          </>
        )}

        {onlineSpecialists.length > 0 && (
          <>
            <h2 className="mb-4 text-sm font-semibold text-freuly-text-primary">
              {t(dict, "search.results.onlineSectionTitle")}
            </h2>
            <ul className="mb-8 space-y-4">
              {onlineSpecialists.map(renderCard)}
            </ul>
          </>
        )}

        {otherSpecialists.length > 0 && (
          <ul className="mb-8 space-y-4">
            {otherSpecialists.map(renderCard)}
          </ul>
        )}

        <ServiceRequestCtaBlock
          lang={uiLang}
          dict={dict}
          variant="fallback"
          returnHref={serviceSearchHref(uiLang)}
          sourcePath={searchContext.sourcePath}
          prefill={assistedPrefill}
        />
      </div>
    </div>
  );
}
