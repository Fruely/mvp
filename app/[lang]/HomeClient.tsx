"use client";

import { Suspense, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Dictionary, Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { buildCategorySearchHref } from "@/lib/search/searchContext";
import { getCategoryTitle } from "@/lib/getCategoryTitle";
import { toCategoryTitleLang } from "@/lib/i18n/toCategoryTitleLang";
import InstallFreuly from "@/components/pwa/InstallFreuly";
import HomeServiceSearchSection from "@/components/home/HomeServiceSearchSection";
import VariantCCategoryIcon from "@/components/home/variantC/VariantCCategoryIcon";
import VariantCSpecialistCard from "@/components/home/variantC/VariantCSpecialistCard";
import VariantCHowItWorksSteps from "@/components/home/variantC/VariantCHowItWorksSteps";
import StarMapSection from "@/components/starMap/StarMapSection";
import type { HomepageInitialData } from "@/lib/homepage/types";
import {
  publicCardClass,
  publicPageContainerClass,
} from "@/components/public/publicStyles";
import { ArrowRight, ShieldCheck, Users } from "lucide-react";

const BOOSTED_CHILD_CATEGORY_SLUGS = ["it-support"] as const;

const TRUST_AVATAR_FALLBACKS = ["#1a8a7d", "#d35a3b", "#6366f1"] as const;

const EMPTY_HOMEPAGE_DATA: HomepageInitialData = {
  categories: [],
  popularCategories: [],
  recommendedSpecialists: [],
  homepageParentSlotSlugs: [],
  starMap: {
    total: 0,
    cities: [],
    eligibleCount: 0,
    representedCount: 0,
    missingCoordinatesCount: 0,
  },
};

export default function HomeClient({
  lang,
  dict,
  initialData,
}: {
  lang: Lang;
  dict: Dictionary;
  initialData: HomepageInitialData;
}) {
  const data = initialData ?? EMPTY_HOMEPAGE_DATA;
  const [categories] = useState(data.categories);
  const [popularCategories] = useState(data.popularCategories);
  const [recommendedSpecialists] = useState(data.recommendedSpecialists);
  const [homepageParentSlotSlugs] = useState(data.homepageParentSlotSlugs);
  const [starMap] = useState(data.starMap);
  const [error] = useState<string | null>(null);
  const isPopularLoading = false;
  const isRecommendedLoading = false;

  const trustAvatars = useMemo(() => {
    return recommendedSpecialists
      .map((item) => item.avatar_url)
      .filter((url): url is string => typeof url === "string" && url.trim().length > 0)
      .slice(0, 3);
  }, [recommendedSpecialists]);

  const storyQuote = t(dict, "home.variantC.story.quote");

  const orderedCategorySections = useMemo(() => {
    const preparedParents: typeof categories = [];

    for (const parent of categories) {
      if (!Array.isArray(parent.children)) continue;

      if (parent.children.length === 0) continue;

      const orderedChildren = [...parent.children]
        .sort((a, b) => {
          const aBoosted = BOOSTED_CHILD_CATEGORY_SLUGS.includes(a.slug as typeof BOOSTED_CHILD_CATEGORY_SLUGS[number]);
          const bBoosted = BOOSTED_CHILD_CATEGORY_SLUGS.includes(b.slug as typeof BOOSTED_CHILD_CATEGORY_SLUGS[number]);

          if (aBoosted && !bBoosted) return -1;
          if (!aBoosted && bBoosted) return 1;
          return getCategoryTitle(a, toCategoryTitleLang(lang)).localeCompare(
            getCategoryTitle(b, toCategoryTitleLang(lang)),
          );
        })
        .slice(0, 3);

      preparedParents.push({
        ...parent,
        children: orderedChildren,
      });
    }

    if (homepageParentSlotSlugs.length === 0) {
      const fallbackBoosted: typeof categories = [];
      const fallbackNormal: typeof categories = [];

      for (const parent of preparedParents) {
        const hasBoostedChild = (parent.children ?? []).some((child) =>
          BOOSTED_CHILD_CATEGORY_SLUGS.includes(child.slug as typeof BOOSTED_CHILD_CATEGORY_SLUGS[number]),
        );

        if (hasBoostedChild) fallbackBoosted.push(parent);
        else fallbackNormal.push(parent);
      }

      return [...fallbackBoosted, ...fallbackNormal].slice(0, 4);
    }

    const parentBySlug = new Map<string, (typeof categories)[number]>();
    for (const parent of preparedParents) {
      parentBySlug.set(parent.slug, parent);
    }

    const orderedParents: typeof categories = [];
    for (const slug of homepageParentSlotSlugs) {
      const parent = parentBySlug.get(slug);
      if (!parent) continue;
      orderedParents.push(parent);
      parentBySlug.delete(slug);
    }

    for (const parent of preparedParents) {
      if (parentBySlug.has(parent.slug)) {
        orderedParents.push(parent);
        parentBySlug.delete(parent.slug);
      }
    }

    return orderedParents.slice(0, 4);
  }, [categories, homepageParentSlotSlugs, lang]);

  const categoryTiles = useMemo(() => {
    const fromParents = orderedCategorySections.flatMap((parent) => parent.children ?? []);
    const source =
      fromParents.length > 0
        ? fromParents
        : popularCategories.map((item) => ({
            id: item.id,
            slug: item.slug,
            title: item.title,
            title_ru: item.title_ru,
            title_de: item.title_de,
            title_ua: item.title_ua,
            specialists_count: item.specialists_count,
            is_clickable: true,
          }));
    return source.slice(0, 6);
  }, [orderedCategorySections, popularCategories]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f8f7f5]">
      {/* Hero */}
      <section className="bg-[#f8f7f5] px-freuly-4 py-16 sm:px-freuly-6 sm:py-20 lg:px-16 lg:py-[110px]">
        <div className={`${publicPageContainerClass} px-0 text-center`}>
          <div className="mx-auto max-w-[840px] space-y-4">
            <h1 className="text-[2rem] font-bold leading-[1.15] tracking-tight text-freuly-text-primary sm:text-[2.375rem] lg:text-[46px]">
              {t(dict, "home.variantC.hero.title")}
            </h1>
            <p className="mx-auto max-w-[680px] text-base leading-relaxed text-freuly-text-secondary">
              {t(dict, "home.variantC.hero.subtitle")}
            </p>
          </div>

          <div className="mx-auto mt-8 w-full max-w-xl text-left md:hidden">
            <InstallFreuly
              lang={lang}
              audience="client"
              placement="home_mobile"
              variant="compact"
            />
          </div>

          <Suspense
            fallback={
              <div
                className="mx-auto mt-10 max-w-[820px] rounded-2xl border border-freuly-border-default bg-white p-6 shadow-sm"
                aria-hidden
              >
                <div className="h-10 animate-pulse rounded-lg bg-freuly-border-subtle" />
              </div>
            }
          >
            <div id="home-service-search">
              <HomeServiceSearchSection
                lang={lang}
                className="mx-auto mt-10 max-w-[820px]"
              />
            </div>
          </Suspense>

          <div className="mx-auto mt-10 inline-flex max-w-full flex-wrap items-center justify-center gap-3.5">
            <div className="flex items-center" aria-hidden>
              {Array.from({ length: 3 }).map((_, idx) => {
                const avatarUrl = trustAvatars[idx];
                const fallbackColor = TRUST_AVATAR_FALLBACKS[idx] ?? TRUST_AVATAR_FALLBACKS[0];
                return (
                  <span
                    key={`trust-avatar-${idx}`}
                    className={[
                      "inline-flex h-7 w-7 overflow-hidden rounded-[14px] border-2 border-[#f8f7f5]",
                      idx < 2 ? "-mr-2.5" : "",
                    ].join(" ")}
                  >
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt=""
                        width={28}
                        height={28}
                        sizes="28px"
                        className="h-full w-full object-cover"
                        priority={idx === 0}
                      />
                    ) : (
                      <span className="block h-full w-full" style={{ backgroundColor: fallbackColor }} />
                    )}
                  </span>
                );
              })}
            </div>
            <p className="text-[13px] font-medium text-freuly-text-secondary">
              {t(dict, "home.variantC.hero.trustLine")}
            </p>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-white px-freuly-4 py-16 sm:px-freuly-6 sm:py-20 lg:px-16 lg:py-24">
        <div className={`${publicPageContainerClass} space-y-10 px-0`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-[1.75rem] font-bold leading-tight text-freuly-text-primary sm:text-[32px]">
              {t(dict, "home.variantC.categories.title")}
            </h2>
            <Link
              href={`/${lang}/service-search`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-freuly-primary hover:text-freuly-primary-hover"
            >
              {t(dict, "home.variantC.categories.viewAll")}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>

          {isPopularLoading && categoryTiles.length === 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={`category-skeleton-${idx}`}
                  className={`${publicCardClass} h-[132px] animate-pulse border border-freuly-border-default bg-[#f8f7f5] p-6`}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {categoryTiles.map((child, index) => {
                const label = getCategoryTitle(child, toCategoryTitleLang(lang));
                const description = t(dict, "home.variantC.categories.tileHint");
                const cardInner = (
                  <>
                    <div className="flex items-center gap-3">
                      <VariantCCategoryIcon slug={child.slug} index={index} />
                      <span className="text-lg font-semibold leading-tight text-freuly-text-primary line-clamp-1">
                        {label}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-freuly-text-secondary line-clamp-2">
                      {description}
                    </p>
                  </>
                );

                return (
                  <Link
                    key={child.id}
                    href={buildCategorySearchHref(lang, child.slug)}
                    className={`${publicCardClass} flex flex-col gap-3.5 border border-freuly-border-default bg-[#f8f7f5] p-6 transition-colors hover:border-freuly-primary/30`}
                  >
                    {cardInner}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* How it works — before specialists (Variant C order) */}
      <section className="bg-[#eaf6f5] px-freuly-4 py-16 sm:px-freuly-6 sm:py-20 lg:px-16 lg:py-[100px]">
        <div className={`${publicPageContainerClass} space-y-12 px-0`}>
          <div className="space-y-2">
            <p className="text-[13px] font-bold uppercase tracking-wide text-freuly-primary">
              {t(dict, "home.variantC.howItWorks.eyebrow")}
            </p>
            <h2 className="max-w-3xl text-[1.75rem] font-bold leading-[1.2] text-freuly-text-primary sm:text-4xl">
              {t(dict, "home.variantC.howItWorks.headline")}
            </h2>
          </div>
          <VariantCHowItWorksSteps dict={dict} />
        </div>
      </section>

      <StarMapSection lang={lang} dict={dict} data={starMap} />

      {/* Recommended specialists */}
      {(isRecommendedLoading || recommendedSpecialists.length > 0) && (
        <section className="bg-[#f8f7f5] px-freuly-4 pb-20 pt-16 sm:px-freuly-6 sm:pb-24 sm:pt-20 lg:px-16 lg:pb-[104px] lg:pt-24">
          <div className="mx-auto w-full max-w-[1312px] space-y-12">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-freuly-primary">
                  {t(dict, "home.variantC.recommended.eyebrow")}
                </p>
                <h2 className="text-[1.75rem] font-bold leading-tight text-freuly-text-primary sm:text-[32px]">
                  {t(dict, "home.variantC.recommended.title")}
                </h2>
              </div>
              <Link
                href={`/${lang}/service-search`}
                className="inline-flex items-center gap-1 text-sm font-semibold text-freuly-primary hover:text-freuly-primary-hover"
              >
                {t(dict, "home.variantC.recommended.viewAll")}
                <span aria-hidden>→</span>
              </Link>
            </div>

            {isRecommendedLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4" aria-hidden>
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={`recommended-skeleton-${idx}`} className={`${publicCardClass} overflow-hidden`}>
                    <div className="h-[200px] animate-pulse bg-freuly-border-subtle" />
                    <div className="space-y-2 p-5">
                      <div className="h-5 w-2/3 rounded bg-freuly-border-subtle" />
                      <div className="h-4 w-1/2 rounded bg-freuly-border-subtle" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                {recommendedSpecialists.slice(0, 4).map((specialist) => (
                  <VariantCSpecialistCard
                    key={specialist.id}
                    specialist={specialist}
                    lang={lang}
                    dict={dict}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Story */}
      <section className="bg-white px-freuly-4 py-16 sm:px-freuly-6 sm:py-20 lg:px-16 lg:py-[120px]">
        <div className={`${publicPageContainerClass} px-0`}>
          <div className="mx-auto max-w-[920px] rounded-3xl bg-[#eaf6f5] p-8 sm:p-12">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-5">
                <p className="text-[13px] font-bold uppercase tracking-wide text-freuly-primary">
                  {t(dict, "home.variantC.story.eyebrow")}
                </p>
                <p className="text-[1.375rem] font-semibold leading-[1.4] text-freuly-text-primary sm:text-[26px]">
                  {storyQuote}
                </p>
              </div>
              <Link
                href={`/${lang}/service-search`}
                className="inline-flex shrink-0 items-center gap-1 self-start text-sm font-semibold text-freuly-primary hover:text-freuly-primary-hover lg:self-end"
              >
                {t(dict, "home.variantC.story.cta")}
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Promos */}
      <section className="bg-white px-freuly-4 py-16 sm:px-freuly-6 sm:py-20 lg:px-16 lg:py-24">
        <div className={`${publicPageContainerClass} px-0`}>
          <div className="grid gap-6 lg:grid-cols-2">
            <Link
              href={`/${lang}/partners`}
              className={`${publicCardClass} flex gap-6 bg-[#fff1ec] p-8 transition-colors hover:border-freuly-primary/30`}
            >
              <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white">
                <Users className="h-6 w-6 text-[#d35a3b]" aria-hidden />
              </span>
              <span className="space-y-2">
                <span className="block text-xl font-bold text-freuly-text-primary">
                  {t(dict, "home.variantC.promo.invite.title")}
                </span>
                <span className="block text-sm leading-relaxed text-freuly-text-secondary">
                  {t(dict, "home.variantC.promo.invite.body")}
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#d35a3b]">
                  {t(dict, "home.variantC.promo.invite.cta")}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </span>
            </Link>

            <Link
              href={`/${lang}/for-specialists`}
              className={`${publicCardClass} flex gap-6 bg-[#eaf6f5] p-8 transition-colors hover:border-freuly-primary/30`}
            >
              <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white">
                <ShieldCheck className="h-6 w-6 text-freuly-primary" aria-hidden />
              </span>
              <span className="space-y-2">
                <span className="block text-xl font-bold text-freuly-text-primary">
                  {t(dict, "home.variantC.promo.specialist.title")}
                </span>
                <span className="block text-sm leading-relaxed text-freuly-text-secondary">
                  {t(dict, "home.mapCta.body")}
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-freuly-primary">
                  {t(dict, "home.variantC.promo.specialist.cta")}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="bg-[#f8f7f5] px-freuly-4 py-12 sm:px-freuly-6 lg:px-16 lg:py-14">
        <div className={`${publicPageContainerClass} px-0`}>
          <div className="mx-auto grid max-w-[860px] gap-8 text-center sm:grid-cols-3 sm:gap-6">
            {[
              {
                titleKey: "home.variantC.trust.reviewed.title",
                bodyKey: "home.variantC.trust.reviewed.body",
              },
              {
                titleKey: "home.variantC.trust.format.title",
                bodyKey: "home.variantC.trust.format.body",
              },
              {
                titleKey: "home.variantC.trust.multilingual.title",
                bodyKey: "home.variantC.trust.multilingual.body",
              },
            ].map(({ titleKey, bodyKey }) => (
              <div key={titleKey} className="space-y-1">
                <p className="text-[15px] font-bold text-freuly-text-primary">{t(dict, titleKey)}</p>
                <p className="text-[13px] leading-relaxed text-freuly-text-secondary">{t(dict, bodyKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <div className="fixed bottom-4 right-4 rounded-lg border border-freuly-error/20 bg-freuly-error-light px-4 py-3 text-sm text-freuly-error shadow">
          {error}
        </div>
      )}
    </div>
  );
}
