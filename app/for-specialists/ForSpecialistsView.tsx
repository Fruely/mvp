import Link from "next/link";
import { Suspense } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import LanguageBar from "@/components/LanguageBar";
import { getDictionary, type Lang } from "@/lib/i18n";
import { FOR_SPECIALISTS_COPY } from "./copy";

type Props = { lang: Lang };

type DrawingProps = { variant: "stress" | "requests" | "flow" | "money"; className?: string };

function LineDrawing({ variant, className = "" }: DrawingProps) {
  const common = "fill-none stroke-gray-950 stroke-[2.2] stroke-linecap-round stroke-linejoin-round";

  if (variant === "flow") {
    return (
      <svg viewBox="0 0 420 260" className={className} role="img" aria-label="Путь клиента от поиска к заявке">
        <rect x="24" y="58" width="96" height="126" rx="16" className={common} />
        <path d="M45 88h50M45 113h62M45 138h46M45 163h55" className={common} />
        <circle cx="50" cy="72" r="4" className={common} />
        <path d="M132 122h54m0 0-15-14m15 14-15 14" className={common} />
        <rect x="200" y="42" width="96" height="156" rx="18" className={common} />
        <circle cx="248" cy="82" r="18" className={common} />
        <path d="M224 124h48M218 145h60M226 168h44" className={common} />
        <path d="M308 122h54m0 0-15-14m15 14-15 14" className={common} />
        <rect x="318" y="76" width="78" height="78" rx="16" className={common} />
        <path d="M337 106h40M337 126h26M377 146l-40-40" className={common} />
        <path d="M56 218h306" className={common} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 420 260" className={className} role="img" aria-label="Иллюстрация про заявки Freuly">
      {variant === "stress" && (
        <>
          <circle cx="210" cy="96" r="32" className={common} />
          <path d="M178 160c10-34 54-34 64 0M193 91c6-8 27-8 34 0M195 108h2M224 108h2M201 123c8 6 18 6 26 0" className={common} />
          <path d="M154 78l-48-34M264 76l50-36M142 124l-58 14M280 126l58 18" className={common} />
          <rect x="48" y="28" width="86" height="54" rx="10" className={common} />
          <path d="M66 64l15-14 15 9 18-25" className={common} />
          <rect x="287" y="22" width="74" height="70" rx="10" className={common} />
          <path d="M305 42h38M305 60h28M305 78h18" className={common} />
          <circle cx="73" cy="154" r="17" className={common} />
          <path d="M68 154h10M73 145v18" className={common} />
          <circle cx="338" cy="166" r="17" className={common} />
          <path d="M333 166h10M338 157v18" className={common} />
          <path d="M160 207h100M180 178h60" className={common} />
        </>
      )}
      {variant === "requests" && (
        <>
          <circle cx="210" cy="112" r="35" className={common} />
          <path d="M185 103c12-12 37-12 50 0M195 118h2M224 118h2M195 135c12 12 31 12 43 0" className={common} />
          <path d="M175 172c14-38 56-38 70 0" className={common} />
          <rect x="42" y="42" width="110" height="52" rx="14" className={common} />
          <path d="M64 62h54M64 78h34M152 70l36 25" className={common} />
          <rect x="268" y="35" width="112" height="56" rx="14" className={common} />
          <path d="M292 56h54M292 74h38M268 72l-36 28" className={common} />
          <rect x="62" y="148" width="108" height="56" rx="14" className={common} />
          <path d="M86 169h52M86 187h36M170 164l30-24" className={common} />
          <rect x="262" y="150" width="104" height="54" rx="14" className={common} />
          <path d="M286 171h50M286 189h36M262 166l-28-24" className={common} />
        </>
      )}
      {variant === "money" && (
        <>
          <circle cx="184" cy="94" r="31" className={common} />
          <path d="M162 90c10-10 32-10 44 0M174 107h2M197 107h2M174 124c11 9 25 9 36 0" className={common} />
          <path d="M145 172c12-42 68-42 80 0M87 206h114M113 178h74" className={common} />
          <rect x="232" y="117" width="96" height="62" rx="12" className={common} />
          <path d="M248 150h62" className={common} />
          <circle cx="300" cy="202" r="18" className={common} />
          <path d="M294 202h12M300 193v18" className={common} />
          <path d="M260 205h-34M260 184h-23M336 202h24M336 184h14" className={common} />
          <path d="M288 58h48M312 34v48M340 73l32-24M343 93h43" className={common} />
          <circle cx="92" cy="70" r="18" className={common} />
          <path d="M87 70h10M92 61v18" className={common} />
        </>
      )}
    </svg>
  );
}

export async function ForSpecialistsView({ lang }: Props) {
  const copy = FOR_SPECIALISTS_COPY[lang];
  const dict = await getDictionary(lang);
  const becomeHref = `/${lang}/become-specialist`;

  return (
    <>
      <Suspense fallback={<div className="h-9 border-b border-gray-100 bg-white/40" />}>
        <LanguageBar serverLang={lang} />
      </Suspense>
      <Header lang={lang} dict={dict} />
      <main className="bg-white text-gray-950">
        <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-20 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:pb-24 lg:pt-24">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">Freuly для специалистов в Германии</p>
            <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">{copy.hero.headline}</h1>
            <p className="mt-6 max-w-2xl text-xl leading-8 text-gray-700">{copy.hero.sub}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={becomeHref} className="inline-flex h-13 items-center justify-center rounded-lg bg-emerald-600 px-7 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700">{copy.hero.cta}</Link>
              <a href="#how-it-works" className="inline-flex h-13 items-center justify-center rounded-lg border border-gray-300 px-7 text-base font-semibold text-gray-950 transition hover:border-gray-950">Как это работает</a>
            </div>
            <p className="mt-5 max-w-xl text-sm leading-6 text-gray-500">{copy.hero.note}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
            <LineDrawing variant="stress" className="h-auto w-full" />
            <div className="grid grid-cols-3 gap-2 border-t border-gray-200 pt-4 text-center text-sm font-semibold text-gray-700">
              <span>реклама</span><span>контент</span><span>заявки</span>
            </div>
          </div>
        </section>

        <section className="border-y border-gray-200 bg-gray-50 px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
            {copy.proof.map((item) => (
              <div key={item.title} className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <p className="text-3xl font-bold text-emerald-700">{item.value}</p>
                <h2 className="mt-3 text-lg font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">{copy.problem.title}</h2>
            <p className="mt-5 text-lg leading-8 text-gray-700">{copy.problem.intro}</p>
            <div className="mt-8 space-y-4">
              {copy.problem.bullets.map((line) => <p key={line} className="rounded-lg border border-gray-200 bg-white p-4 text-gray-700 shadow-sm">{line}</p>)}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <LineDrawing variant="requests" className="h-auto w-full" />
            <p className="border-t border-gray-200 pt-4 text-center text-lg font-semibold">Хватит бегать за клиентами. Начните получать заявки.</p>
          </div>
        </section>

        <section id="how-it-works" className="bg-gray-950 px-4 py-20 text-white sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="max-w-3xl text-3xl font-bold sm:text-4xl">{copy.steps.title}</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {copy.steps.items.map((step) => (
                <div key={step.title} className="rounded-lg border border-white/15 bg-white/5 p-6">
                  <p className="text-sm font-semibold text-emerald-300">{step.number}</p>
                  <h3 className="mt-3 text-xl font-semibold">{step.title}</h3>
                  <p className="mt-3 leading-7 text-gray-300">{step.body}</p>
                </div>
              ))}
            </div>
            <Link href={becomeHref} className="mt-10 inline-flex h-13 items-center justify-center rounded-lg bg-emerald-500 px-7 text-base font-semibold text-gray-950 transition hover:bg-emerald-400">Начать принимать заявки</Link>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <LineDrawing variant="flow" className="h-auto w-full" />
          </div>
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">{copy.seo.title}</h2>
            <p className="mt-5 text-lg leading-8 text-gray-700">{copy.seo.intro}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {copy.seo.keywords.map((word) => <span key={word} className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">{word}</span>)}
            </div>
          </div>
        </section>

        <section className="bg-gray-50 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold sm:text-4xl">{copy.categories.title}</h2>
              <p className="mt-5 text-lg leading-8 text-gray-700">{copy.categories.intro}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {copy.categories.items.map((item) => <div key={item} className="rounded-lg bg-white p-4 font-medium shadow-sm ring-1 ring-gray-200">{item}</div>)}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">{copy.offer.title}</h2>
            <p className="mt-5 text-lg leading-8 text-gray-700">{copy.offer.intro}</p>
            <ul className="mt-8 space-y-3 text-gray-700">
              {copy.offer.bullets.map((line) => <li key={line} className="flex gap-3"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-600" /><span>{line}</span></li>)}
            </ul>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <LineDrawing variant="money" className="h-auto w-full" />
            <p className="border-t border-gray-200 pt-4 text-center text-lg font-semibold">Вы зарабатываете деньги. Freuly помогает привести обращение к вам.</p>
          </div>
        </section>

        <section className="border-t border-gray-200 bg-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-3xl font-bold sm:text-4xl">{copy.faq.title}</h2>
            <div className="mt-10 space-y-3">
              {copy.faq.items.map((item) => (
                <details key={item.q} className="rounded-lg border border-gray-200 bg-gray-50 p-5 open:bg-white">
                  <summary className="cursor-pointer list-none font-semibold text-gray-950 [&::-webkit-details-marker]:hidden">{item.q}</summary>
                  <p className="mt-3 leading-7 text-gray-700">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-emerald-600 px-4 py-20 text-center text-white sm:px-6 lg:px-8">
          <h2 className="mx-auto max-w-3xl text-3xl font-bold sm:text-5xl">{copy.finalCta.headline}</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-emerald-50">{copy.finalCta.body}</p>
          <Link href={becomeHref} className="mt-8 inline-flex h-13 items-center justify-center rounded-lg bg-white px-8 text-base font-bold text-emerald-700 transition hover:bg-emerald-50">{copy.finalCta.button}</Link>
        </section>
      </main>
      <Footer lang={lang} dict={dict} />
    </>
  );
}
