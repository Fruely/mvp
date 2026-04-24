import Link from "next/link";
import type { Metadata } from "next";
import { getDictionary, getDictValue, t, isSupportedLang, type Lang } from "@/lib/i18n";
import { PRICING_METADATA, hreflangPricing, SITE_DOMAIN } from "@/lib/seo/siteMetadata";

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
  const lang =
    params.lang === "ua" || params.lang === "ru" || params.lang === "de" ? params.lang : "ua";
  const seo = PRICING_METADATA[lang];
  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: `${SITE_DOMAIN}/${lang}/pricing`,
      languages: { ...hreflangPricing() },
    },
  };
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string");
}

type CompareRow = { label: string; starter: string; basic: string; premium: string };

function asCompareRows(value: unknown): CompareRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((r): r is Record<string, unknown> => r != null && typeof r === "object")
    .map((r) => ({
      label: typeof r.label === "string" ? r.label : "",
      starter: typeof r.starter === "string" ? r.starter : "",
      basic: typeof r.basic === "string" ? r.basic : "",
      premium: typeof r.premium === "string" ? r.premium : "",
    }))
    .filter((r) => r.label.length > 0);
}

function asFaqItems(value: unknown): { q: string; a: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((r): r is Record<string, unknown> => r != null && typeof r === "object")
    .map((r) => ({
      q: typeof r.q === "string" ? r.q : "",
      a: typeof r.a === "string" ? r.a : "",
    }))
    .filter((r) => r.q.length > 0 && r.a.length > 0);
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 flex flex-1 flex-col gap-2.5 text-sm leading-snug text-gray-600">
      {items.map((line) => (
        <li key={line} className="flex gap-2.5">
          <span className="mt-0.5 shrink-0 text-indigo-500" aria-hidden>
            ✓
          </span>
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function PricingPage({ params }: { params: { lang: string } }) {
  const lang: Lang = isSupportedLang(params.lang) ? params.lang : "ua";
  const dict = await getDictionary(lang);

  const starterFeatures = asStringArray(getDictValue(dict, "pricing.starter.features"));
  const basicFeatures = asStringArray(getDictValue(dict, "pricing.basic.features"));
  const premiumFeatures = asStringArray(getDictValue(dict, "pricing.premium.features"));
  const noticePoints = asStringArray(getDictValue(dict, "pricing.notice.points"));
  const compareRows = asCompareRows(getDictValue(dict, "pricing.compare.rows"));
  const faqItems = asFaqItems(getDictValue(dict, "pricing.faq"));

  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
      <section className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600/90">
          {t(dict, "pricing.hero.kicker")}
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {t(dict, "pricing.hero.title")}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
          {t(dict, "pricing.hero.subtitle")}
        </p>
      </section>

      <section className="mx-auto mt-10 max-w-3xl">
        <div className="rounded-2xl border border-indigo-100/90 bg-white/90 p-6 shadow-sm shadow-indigo-100/40 backdrop-blur-sm sm:p-8">
          <h2 className="text-lg font-semibold text-gray-900">{t(dict, "pricing.notice.title")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{t(dict, "pricing.notice.lead")}</p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-gray-700">
            {noticePoints.map((point) => (
              <li key={point} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-indigo-400" aria-hidden />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-14 lg:mt-16">
        <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
          {/* Starter */}
          <div className="flex flex-col rounded-2xl border border-gray-200/90 bg-white p-6 shadow-md shadow-gray-200/30 sm:p-7">
            <h2 className="text-lg font-semibold text-gray-900">{t(dict, "pricing.starter.name")}</h2>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">
              {t(dict, "pricing.starter.price")}
            </p>
            <p className="mt-1 text-sm font-medium text-indigo-600">{t(dict, "pricing.starter.priceHint")}</p>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">{t(dict, "pricing.starter.description")}</p>
            <FeatureList items={starterFeatures} />
            <div className="mt-8">
              <Link
                href={`/${lang}/become-specialist`}
                className="inline-flex w-full items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                {t(dict, "pricing.starter.cta")}
              </Link>
            </div>
          </div>

          {/* Basic — subtle emphasis, not “buy now” */}
          <div className="relative flex flex-col rounded-2xl border border-blue-200/70 bg-white p-6 shadow-md shadow-blue-100/40 ring-1 ring-blue-500/10 sm:p-7 lg:scale-[1.02] lg:shadow-lg lg:shadow-blue-100/50">
            <p className="absolute right-5 top-5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              {t(dict, "pricing.basic.badge")}
            </p>
            <h2 className="text-lg font-semibold text-gray-900">{t(dict, "pricing.basic.name")}</h2>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">
              {t(dict, "pricing.basic.price")}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">{t(dict, "pricing.basic.description")}</p>
            <FeatureList items={basicFeatures} />
            <div className="mt-8">
              <span
                className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-full border border-gray-200 bg-gray-50 px-5 py-2.5 text-sm font-semibold text-gray-500"
                role="note"
              >
                {t(dict, "pricing.basic.ctaDisabled")}
              </span>
            </div>
          </div>

          {/* Premium */}
          <div className="flex flex-col rounded-2xl border border-gray-200/90 bg-white p-6 shadow-md shadow-gray-200/30 sm:p-7">
            <h2 className="text-lg font-semibold text-gray-900">{t(dict, "pricing.premium.name")}</h2>
            <p className="mt-3 text-xl font-semibold tracking-tight text-gray-800">
              {t(dict, "pricing.premium.status")}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">{t(dict, "pricing.premium.description")}</p>
            <FeatureList items={premiumFeatures} />
            <div className="mt-8">
              <span
                className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-full border border-gray-200 bg-gray-50 px-5 py-2.5 text-sm font-semibold text-gray-500"
                role="note"
              >
                {t(dict, "pricing.premium.ctaDisabled")}
              </span>
            </div>
          </div>
        </div>
      </section>

      {compareRows.length > 0 && (
        <section className="mx-auto mt-16 max-w-5xl">
          <h2 className="text-center text-xl font-semibold text-gray-900">
            {t(dict, "pricing.compare.title")}
          </h2>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200/90 bg-white shadow-sm">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-4 py-3 font-semibold text-gray-900 sm:px-6">
                    {t(dict, "pricing.compare.colPhase")}
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-900 sm:px-6">
                    {t(dict, "pricing.compare.colStarter")}
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-900 sm:px-6">
                    {t(dict, "pricing.compare.colBasic")}
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-900 sm:px-6">
                    {t(dict, "pricing.compare.colPremium")}
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                {compareRows.map((row) => (
                  <tr key={row.label} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3.5 font-medium text-gray-800 sm:px-6">{row.label}</td>
                    <td className="px-4 py-3.5 sm:px-6">{row.starter}</td>
                    <td className="px-4 py-3.5 sm:px-6">{row.basic}</td>
                    <td className="px-4 py-3.5 sm:px-6">{row.premium}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {faqItems.length > 0 && (
        <section className="mx-auto mt-16 max-w-3xl">
          <h2 className="text-xl font-semibold text-gray-900">{t(dict, "pricing.faqTitle")}</h2>
          <dl className="mt-6 space-y-6 border-t border-gray-200/80">
            {faqItems.map((item) => (
              <div key={item.q} className="border-b border-gray-100 pb-6 pt-6 first:pt-6 last:border-0">
                <dt className="font-medium text-gray-900">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-gray-600">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <p className="mx-auto mt-14 max-w-2xl text-center text-xs leading-relaxed text-gray-500">
        {t(dict, "pricing.disclaimer")}
      </p>
    </main>
  );
}
