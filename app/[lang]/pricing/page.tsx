import Link from "next/link";
import type { Metadata } from "next";
import PlanVisualPreview from "@/components/pricing/PlanVisualPreview";
import { getDictionary, getDictValue, t, isSupportedLang, type Lang } from "@/lib/i18n";
import { PRICING_METADATA, hreflangPricing, SITE_DOMAIN } from "@/lib/seo/siteMetadata";
import { getOptionalAuthenticatedSpecialist } from "@/lib/specialists/optionalAuth";
import type { PaidPlanCode } from "@/lib/billing/plans";
import { getPublicPricingCopy } from "@/lib/pricing/publicPricingCopy";

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

type CompareRow = { label: string; professional: string; growth: string };

function asCompareRows(value: unknown): CompareRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((r): r is Record<string, unknown> => r != null && typeof r === "object")
    .map((r) => ({
      label: typeof r.label === "string" ? r.label : "",
      professional: typeof r.professional === "string" ? r.professional : "",
      growth: typeof r.growth === "string" ? r.growth : "",
    }))
    .filter((r) => r.label.length > 0);
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

function paidPlanBillingHref(lang: Lang, plan: PaidPlanCode): string {
  return `/${lang}/specialist/dashboard/billing?plan=${plan}`;
}

function PricingPaidPlanCta({
  lang,
  dict,
  plan,
  hasSpecialist,
  isAuthenticated,
}: {
  lang: Lang;
  dict: Awaited<ReturnType<typeof getDictionary>>;
  plan: PaidPlanCode;
  hasSpecialist: boolean;
  isAuthenticated: boolean;
}) {
  if (hasSpecialist) {
    return (
      <Link
        href={paidPlanBillingHref(lang, plan)}
        className="inline-flex w-full items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
      >
        {t(dict, "pricing.cta.choosePlan")}
      </Link>
    );
  }

  if (isAuthenticated) {
    return (
      <Link
        href={`/${lang}/specialist/dashboard`}
        className="inline-flex w-full items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
      >
        {t(dict, "pricing.cta.completeProfile")}
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      className="inline-flex w-full items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
    >
      {t(dict, "pricing.cta.loginToChoose")}
    </Link>
  );
}

export default async function PricingPage({ params }: { params: { lang: string } }) {
  const lang: Lang = isSupportedLang(params.lang) ? params.lang : "ua";
  const dict = await getDictionary(lang);
  const copy = getPublicPricingCopy(lang);
  const { specialist, isAuthenticated } = await getOptionalAuthenticatedSpecialist();
  const hasSpecialist = Boolean(specialist?.id);
  const compareRows = asCompareRows(getDictValue(dict, "pricing.compare.rows"));

  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
      <section className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600/90">
          {copy.hero.kicker}
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {copy.hero.title}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
          {copy.hero.subtitle}
        </p>
      </section>

      <section className="mx-auto mt-10 max-w-3xl">
        <div className="rounded-2xl border border-indigo-100/90 bg-white/90 p-6 shadow-sm shadow-indigo-100/40 backdrop-blur-sm sm:p-8">
          <h2 className="text-lg font-semibold text-gray-900">{copy.notice.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{copy.notice.lead}</p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-gray-700">
            {copy.notice.points.map((point) => (
              <li key={point} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-indigo-400" aria-hidden />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-14 lg:mt-16">
        <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="flex flex-col rounded-2xl border border-gray-200/90 bg-white p-6 shadow-md shadow-gray-200/30 sm:p-7">
            <h2 className="text-lg font-semibold text-gray-900">{copy.professional.name}</h2>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">
              {copy.professional.price}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">{copy.professional.description}</p>
            <FeatureList items={copy.professional.features} />
            <PlanVisualPreview
              plan="professional"
              lang={lang}
              label={copy.preview.professionalLabel}
            />
            <div className="mt-8">
              <PricingPaidPlanCta
                lang={lang}
                dict={dict}
                plan="basic"
                hasSpecialist={hasSpecialist}
                isAuthenticated={isAuthenticated}
              />
            </div>
          </div>

          <div className="relative flex flex-col rounded-2xl border border-indigo-200/80 bg-white p-6 shadow-md shadow-indigo-100/40 ring-1 ring-indigo-500/10 sm:p-7">
            <p className="absolute right-5 top-5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
              {copy.growth.badge}
            </p>
            <h2 className="text-lg font-semibold text-gray-900">{copy.growth.name}</h2>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">{copy.growth.price}</p>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">{copy.growth.description}</p>
            <FeatureList items={copy.growth.features} />
            <PlanVisualPreview plan="growth" lang={lang} label={copy.preview.growthLabel} />
            <div className="mt-8">
              <PricingPaidPlanCta
                lang={lang}
                dict={dict}
                plan="premium"
                hasSpecialist={hasSpecialist}
                isAuthenticated={isAuthenticated}
              />
            </div>
          </div>
        </div>
      </section>

      {compareRows.length > 0 && (
        <section className="mx-auto mt-16 max-w-4xl">
          <h2 className="text-center text-xl font-semibold text-gray-900">{copy.compareTitle}</h2>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200/90 bg-white shadow-sm">
            <table className="w-full min-w-[480px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-4 py-3 font-semibold text-gray-900 sm:px-6">
                    {t(dict, "pricing.compare.colFeature")}
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-900 sm:px-6">
                    {copy.professional.name}
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-900 sm:px-6">{copy.growth.name}</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                {compareRows.map((row) => (
                  <tr key={row.label} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3.5 font-medium text-gray-800 sm:px-6">{row.label}</td>
                    <td className="px-4 py-3.5 sm:px-6">{row.professional}</td>
                    <td className="px-4 py-3.5 sm:px-6">{row.growth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mx-auto mt-16 max-w-3xl">
        <h2 className="text-xl font-semibold text-gray-900">{copy.faqTitle}</h2>
        <dl className="mt-6 space-y-6 border-t border-gray-200/80">
          {copy.faq.map((item) => (
            <div key={item.q} className="border-b border-gray-100 pb-6 pt-6 first:pt-6 last:border-0">
              <dt className="font-medium text-gray-900">{item.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-gray-600">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mx-auto mt-14 max-w-2xl text-center text-xs leading-relaxed text-gray-500">
        {copy.disclaimer}
      </p>
    </main>
  );
}
