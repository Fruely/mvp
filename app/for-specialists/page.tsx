import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { FOR_SPECIALISTS_COPY } from "./copy";
import { getDictionary, isSupportedLang, type Lang } from "@/lib/i18n";

const LANG_COOKIE = "freuly_lang";

async function resolveLang(): Promise<Lang> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LANG_COOKIE)?.value ?? "";
  return isSupportedLang(raw) ? raw : "ua";
}

export async function generateMetadata(): Promise<Metadata> {
  const lang = await resolveLang();
  const m = FOR_SPECIALISTS_COPY[lang].meta;
  return {
    title: m.title,
    description: m.description,
  };
}

export default async function ForSpecialistsPage() {
  const lang = await resolveLang();
  const copy = FOR_SPECIALISTS_COPY[lang];
  const dict = await getDictionary(lang);

  return (
    <>
      <Header lang={lang} dict={dict} />
      <main className="min-h-screen bg-white text-gray-900">
        {/* Hero */}
        <section className="px-4 pb-20 pt-24 text-center sm:px-6 lg:px-8">
          <h1 className="mx-auto max-w-3xl text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
            {copy.hero.headline}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600">{copy.hero.sub}</p>
          <Link
            href="/become-specialist"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-emerald-600 px-7 text-base font-semibold text-white transition hover:bg-emerald-700"
          >
            {copy.hero.cta}
          </Link>
        </section>

        {/* Why social / word-of-mouth alone is not enough */}
        <section className="bg-gray-50 px-4 py-20 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">{copy.socialLimits.title}</h2>
          <p className="mx-auto mt-5 max-w-2xl text-center text-lg text-gray-600">{copy.socialLimits.intro}</p>
          <ul className="mx-auto mt-10 max-w-3xl list-none space-y-4 text-left text-gray-700">
            {copy.socialLimits.bullets.map((line) => (
              <li key={line} className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-600" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-12 text-center">
            <Link
              href="/become-specialist"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-emerald-600 px-7 text-base font-semibold text-white transition hover:bg-emerald-700"
            >
              {copy.ctaAfterSocial}
            </Link>
          </div>
        </section>

        {/* What Freuly gives */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">{copy.valueProps.title}</h2>
          <div className="mx-auto mt-12 grid max-w-5xl gap-8 sm:grid-cols-3">
            {copy.valueProps.cards.map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{card.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Who it fits */}
        <section className="bg-gray-50 px-4 py-20 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">{copy.audience.title}</h2>
          <ul className="mx-auto mt-10 max-w-3xl list-none space-y-3 text-gray-700">
            {copy.audience.bullets.map((line) => (
              <li key={line} className="flex gap-3">
                <span className="font-semibold text-emerald-600">—</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Push notifications */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-2 sm:px-6 lg:px-8">
          <div>
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl">{copy.push.title}</h2>
            <p className="mb-6 text-lg text-gray-700">{copy.push.intro}</p>
            <ul className="mb-6 space-y-2 text-base text-gray-600">
              {copy.push.bullets.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <span className="mt-0.5 text-emerald-600">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/become-specialist"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-emerald-600 px-7 text-base font-semibold text-white transition hover:bg-emerald-700"
            >
              {copy.push.cta}
            </Link>
          </div>
          <div className="flex justify-center md:justify-end">
            <img
              src="/images/push-notification.jpeg"
              alt={copy.push.imageAlt}
              width={360}
              height={360}
              className="w-full max-w-xs rounded-3xl shadow-2xl"
            />
          </div>
        </section>

        {/* How it works */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">{copy.steps.title}</h2>
          <div className="mx-auto mt-12 grid max-w-4xl gap-10 sm:grid-cols-3">
            {copy.steps.items.map((step) => (
              <div key={step.number} className="text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">
                  {step.number}
                </span>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/become-specialist"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-emerald-600 px-7 text-base font-semibold text-white transition hover:bg-emerald-700"
            >
              {copy.ctaAfterSteps}
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-gray-100 bg-white px-4 py-20 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">{copy.faq.title}</h2>
          <div className="mx-auto mt-10 max-w-3xl space-y-3">
            {copy.faq.items.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-gray-200 bg-gray-50/80 p-4 open:bg-white"
              >
                <summary className="cursor-pointer list-none font-semibold text-gray-900 marker:content-none [&::-webkit-details-marker]:hidden">
                  {item.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-gray-50 px-4 py-20 text-center sm:px-6 lg:px-8">
          <h2 className="mx-auto max-w-2xl text-2xl font-bold sm:text-3xl">{copy.finalCta.headline}</h2>
          <Link
            href="/become-specialist"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-emerald-600 px-7 text-base font-semibold text-white transition hover:bg-emerald-700"
          >
            {copy.finalCta.button}
          </Link>
        </section>
      </main>
      <Footer lang={lang} dict={dict} />
    </>
  );
}
