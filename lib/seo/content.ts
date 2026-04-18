import type { Lang } from "@/lib/i18n";

/**
 * Shared SEO content model for Freuly category landing pages.
 *
 * This file is intentionally additive. New SEO category landings use this
 * model with the `CategoryContentPage` template and `content/seo/v2/*.content.ts`.
 *
 * The model supports two page roles:
 *   - "parent": an umbrella / hub page (e.g. "health-psychology", "retreats")
 *   - "child":  a specific intent page (e.g. "psychologists-germany")
 *
 * Each `SeoCategoryContent` value is already localized (single `locale`).
 * A page typically owns a `Record<Lang, SeoCategoryContent>` and picks the
 * right entry at render time. This shape is also designed to be the
 * "target" of a future auto-translation pipeline — see `SeoMasterSource`.
 */

export type SeoCategoryType = "parent" | "child";

export type SeoSection = {
  /** H2 heading of the section. */
  heading: string;
  /** One or more paragraphs rendered as <p> inside the section. */
  body?: string | readonly string[];
  /** Optional bullet list rendered below the body. */
  bullets?: readonly string[];
};

export type SeoFaqItem = {
  question: string;
  answer: string;
};

export type SeoSubcategoryLink = {
  /** Slug used in `/{lang}/category/{slug}` links. */
  slug: string;
  label: string;
  /** Optional short description shown on the parent/child page. */
  description?: string;
};

export type SeoRelatedLink = {
  /**
   * Page slug relative to `/{lang}/`, e.g. "psychologists-germany" or
   * "reisen-tourismus". Rendered as `/{lang}/{href}`.
   */
  href: string;
  label: string;
  description?: string;
};

export type SeoCallout = {
  heading: string;
  body: string;
  buttonLabel: string;
  /**
   * Optional override for the CTA destination. Defaults to
   * `/{lang}/category/{slug}` when not provided.
   */
  ctaHref?: string;
};

export type SeoCategoryContent = {
  /** Page slug, e.g. "health-psychology". Must match the route segment. */
  slug: string;
  /**
   * For child pages: the slug of the parent hub. Used for breadcrumbs and
   * "back to parent" links. `null` / missing for parent pages.
   */
  parentSlug?: string | null;
  locale: Lang;
  categoryType: SeoCategoryType;

  /* ---- Meta ---- */
  metaTitle: string;
  metaDescription: string;
  h1: string;
  /** Human label used inside breadcrumbs for this page. */
  breadcrumbsLabel: string;
  /** Human label used for the "Home" breadcrumb item in this locale. */
  homeLabel: string;
  /** Human label used for the parent breadcrumb item (child pages only). */
  parentLabel?: string;

  /* ---- Above the fold ---- */
  /** One or more SSR paragraphs rendered right under H1. */
  intro: string | readonly string[];

  /* ---- Subcategories (optional) ---- */
  subcategoriesTitle?: string;
  subcategories?: readonly SeoSubcategoryLink[];

  /* ---- Body sections ---- */
  sections: readonly SeoSection[];

  /* ---- Specialists list ---- */
  specialistsTitle: string;
  specialistsEmpty: string;

  /* ---- FAQ (optional) ---- */
  faqTitle?: string;
  faq?: readonly SeoFaqItem[];

  /* ---- Related links ---- */
  relatedTitle: string;
  relatedLinks: readonly SeoRelatedLink[];

  /* ---- CTA ---- */
  cta: SeoCallout;

  /* ---- Optional trailing long-form prose ---- */
  seoText?: string;
};

/**
 * Content keyed by locale. This is what a content file typically exports.
 */
export type LocalizedSeoCategory = {
  slug: string;
  parentSlug?: string | null;
  categoryType: SeoCategoryType;
  /**
   * Optional Supabase `or` filter used to list matching specialists on the
   * landing page (same contract as existing `FILTER_OR` constants).
   */
  filterOr?: string;
  content: Record<Lang, SeoCategoryContent>;
};

/* --------------------------------------------------------------------------
 * Future auto-translation pipeline — interfaces only, not invoked yet.
 *
 * The intent is to let content teams author a single `master` locale
 * (typically `de`) and generate the other two via a translator hook. We
 * deliberately do NOT wire a translation API into the runtime: the
 * pipeline should run offline, with human review, and emit plain TS
 * content files that match `LocalizedSeoCategory.content`.
 * ------------------------------------------------------------------------ */

export type SeoMasterSource = {
  slug: string;
  parentSlug?: string | null;
  categoryType: SeoCategoryType;
  filterOr?: string;
  masterLocale: Lang;
  master: SeoCategoryContent;
};

export type SeoTranslator = (args: {
  master: SeoCategoryContent;
  targetLocale: Lang;
}) => Promise<SeoCategoryContent>;
