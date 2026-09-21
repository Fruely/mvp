import Link from "next/link";
import type { Metadata } from "next";
import PlanVisualPreview from "@/components/pricing/PlanVisualPreview";
import PricingAdditionalServices from "@/components/pricing/PricingAdditionalServices";
import { getDictionary, getDictValue, t, isSupportedLang, type Lang } from "@/lib/i18n";
import { PRICING_METADATA, hreflangPricing, SITE_DOMAIN } from "@/lib/seo/siteMetadata";
import { getOptionalAuthenticatedSpecialist } from "@/lib/specialists/optionalAuth";
import type { PaidPlanCode } from "@/lib/billing/plans";
import { getCurrentPublicPricingCopy } from "@/lib/pricing/currentPublicPricingCopy";
import { brandPlanText, brandPlanTexts } from "@/lib/pricing/planDisplayBranding";

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
  const lang =
    params.lang === "ua" || params.lang === "ru" || params.lang === "de" ? params.lang : "ua";
  const seo = PRICING_METADATA[lang];
  return {
    title: brandPlanText(seo.title),
    description: brandPlanText(seo.description),
    alternates: {
      canonical: `${SITE_DOMAIN}/${lang}/pricing`,
      languages: { ...hreflangPricing() },
    },
  };
}

type CompareRow = { label: string; professional: string; growth: string };

function freeEntryCtaCopy(lang: Lang) {
  if (lang === "de") {
    return {
      draftTitle: "Ihr kostenloses Profil ist bereits gespeichert.",
      draftBody: "Sie können die Tarifseite in Ruhe ansehen und danach jederzeit zur Profilerstellung zurückkehren. Für die Veröffentlichung des Basisprofils ist kein Tarif erforderlich.",
      draftPrimary: "Kostenloses Profil fortsetzen",
      draftSecondary: "Zum Fachkräfte-Konto",
      guestTitle: "Noch kein Fachkräfte-Konto?",
      guestBody: "Erstellen und veröffentlichen Sie Ihr Basisprofil kostenlos. Einen Tarif wählen Sie erst, wenn Sie Anfragezugang im Tarif möchten.",
      guestPrimary: "Kostenloses Profil erstellen",
      guestSecondary: "Bereits registriert? Anmelden",
    };
  }
  if (lang === "ua") {
    return {
      draftTitle: "Ваш безкоштовний профіль уже збережено.",
      draftBody: "Ви можете спокійно переглянути тарифи й у будь-який момент повернутися до профілю. Для публікації базового профілю тариф не потрібен.",
      draftPrimary: "Продовжити безкоштовний профіль",
      draftSecondary: "До кабінету спеціаліста",
      guestTitle: "Ще немає акаунта спеціаліста?",
      guestBody: "Створіть і опублікуйте базовий профіль безкоштовно. Тариф можна обрати пізніше, якщо потрібен доступ до запитів у межах тарифу.",
      guestPrimary: "Створити безкоштовний профіль",
      guestSecondary: "Вже зареєстровані? Увійти",
    };
  }
  return {
    draftTitle: "Ваш бесплатный профиль уже сохранён.",
    draftBody: "Вы можете спокойно посмотреть тарифы и в любой момент вернуться к профилю. Для публикации базового профиля тариф не нужен.",
    draftPrimary: "Продолжить бесплатный профиль",
    draftSecondary: "В кабинет специалиста",
    guestTitle: "Ещё нет аккаунта специалиста?",
    guestBody: "Создайте и опубликуйте базовый профиль бесплатно. Тариф можно выбрать позже, если нужен доступ к заявкам в рамках тарифа.",
    guestPrimary: "Создать бесплатный профиль",
    guestSecondary: "Уже зарегистрированы? Войти",
  };
}


function asCompareRows(value: unknown): CompareRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((r): r is Record<string, unknown> => r != null && typeof r === "object")
    .map((r) => ({
      label: typeof r.label === "string" ? brandPlanText(r.label) : "",
      professional: typeof r.professional === "string" ? brandPlanText(r.professional) : "",
      growth: typeof r.growth === "string" ? brandPlanText(r.growth) : "",
    }))
    .filter((r) => r.label.length > 0);
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 flex flex-1 flex-col gap-2.5 text-sm leading-relaxed text-gray-600 lg:text-base">
      {brandPlanTexts(items).map((line) => (
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
        {brandPlanText(t(dict, "pricing.cta.choosePlan"))}
      </Link>
    );
  }

  if (isAuthenticated) {
    return (
      <Link
        href={`/${lang}/specialist/dashboard`}
        className="inline-flex w-full items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
      >
        {brandPlanText(t(dict, "pricing.cta.completeProfile"))}
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      className="inline-flex w-full items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
    >
      {brandPlanText(t(dict, "pricing.cta.loginToChoose"))}
    </Link>
  );
}

export default async function PricingPage({ params }: { params: { lang: string } }) {
  const lang: Lang = isSupportedLang(params.lang) ? params.lang : "ua";
  const dict = await getDictionary(lang);
  const copy = getCurrentPublicPricingCopy(lang);
  const { specialist, isAuthenticated } = await getOptionalAuthenticatedSpecialist();
  const hasSpecialist = Boolean(specialist?.id);
  const specialistIsDraft = Boolean(hasSpecialist && (!specialist?.status || specialist.status === "draft"));
  const entryCta = freeEntryCtaCopy(lang);
  const compareRows = asCompareRows(getDictValue(dict, "pricing.compare.rows"));

  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
      <section className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600/90">
          {brandPlanText(copy.hero.kicker)}
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {brandPlanText(copy.hero.title)}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
          {brandPlanText(copy.hero.subtitle)}
        </p>
      </section>

      {specialistIsDraft ? (
        <section className="mx-auto mt-8 max-w-3xl rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900">{entryCta.draftTitle}</h2>
          <p className="mt-2 text-base leading-relaxed text-gray-700">{entryCta.draftBody}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/${lang}/specialist/dashboard/onboarding`}
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              {entryCta.draftPrimary}
            </Link>
            <Link
              href={`/${lang}/specialist/dashboard`}
              className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
            >
              {entryCta.draftSecondary}
            </Link>
          </div>
        </section>
      ) : !isAuthenticated ? (
        <section className="mx-auto mt-8 max-w-3xl rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900">{entryCta.guestTitle}</h2>
          <p className="mt-2 text-base leading-relaxed text-gray-600">{entryCta.guestBody}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/${lang}/become-specialist`}
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              {entryCta.guestPrimary}
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
            >
              {entryCta.guestSecondary}
            </Link>
          </div>
        </section>
      ) : null}

      <section className="mx-auto mt-10 max-w-3xl">
        <div className="rounded-2xl border border-indigo-100/90 bg-white/90 p-6 shadow-sm shadow-indigo-100/40 backdrop-blur-sm sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900 lg:text-2xl">{brandPlanText(copy.notice.title)}</h2>
          <p className="mt-3 text-base leading-relaxed text-gray-600 lg:text-lg">{brandPlanText(copy.notice.lead)}</p>
          <ul className="mt-5 space-y-3 text-base leading-relaxed text-gray-700 lg:text-lg">
            {brandPlanTexts(copy.notice.points).map((point) => (
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
            <h2 className="text-lg font-semibold text-gray-900">{brandPlanText(copy.professional.name)}</h2>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">
              {copy.professional.price}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-gray-600 lg:text-base">{brandPlanText(copy.professional.description)}</p>
            <FeatureList items={copy.professional.features} />
            <PlanVisualPreview plan="professional" lang={lang} label={brandPlanText(copy.preview.professionalLabel)} />
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
              {brandPlanText(copy.growth.badge)}
            </p>
            <h2 className="text-lg font-semibold text-gray-900">{brandPlanText(copy.growth.name)}</h2>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">{copy.growth.price}</p>
            <p className="mt-4 text-sm leading-relaxed text-gray-600 lg:text-base">{brandPlanText(copy.growth.description)}</p>
            <FeatureList items={copy.growth.features} />
            <PlanVisualPreview plan="growth" lang={lang} label={brandPlanText(copy.preview.growthLabel)} />
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
          <h2 className="text-center text-xl font-semibold text-gray-900">{brandPlanText(copy.compareTitle)}</h2>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200/90 bg-white shadow-sm">
            <table className="w-full min-w-[480px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-4 py-3 font-semibold text-gray-900 sm:px-6">
                    {brandPlanText(t(dict, "pricing.compare.colFeature"))}
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-900 sm:px-6">
                    {brandPlanText(copy.professional.name)}
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-900 sm:px-6">{brandPlanText(copy.growth.name)}</th>
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

      <PricingAdditionalServices lang={lang} />

      <section className="mx-auto mt-16 max-w-3xl">
        <h2 className="text-xl font-semibold text-gray-900">{brandPlanText(copy.faqTitle)}</h2>
        <dl className="mt-6 space-y-6 border-t border-gray-200/80">
          {copy.faq.map((item) => (
            <div key={item.q} className="border-b border-gray-100 pb-6 pt-6 first:pt-6 last:border-0">
              <dt className="font-medium text-gray-900 lg:text-lg">{brandPlanText(item.q)}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-gray-600 lg:text-base">{brandPlanText(item.a)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mx-auto mt-14 max-w-2xl text-center text-xs leading-relaxed text-gray-500">
        {brandPlanText(copy.disclaimer)}
      </p>
    </main>
  );
}
