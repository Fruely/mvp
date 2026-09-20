import Image from "next/image";
import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { CURRENT_CURRENT_FOR_SPECIALISTS_COPY } from "./currentCopy";

type Props = { lang: Lang };

type IllustrationVariant = "stress" | "requests" | "flow" | "money";

const illustrationSrc: Record<IllustrationVariant, string> = {
  stress: "/images/for-specialists/scene-before.png",
  requests: "/images/for-specialists/scene-requests.png",
  flow: "/images/for-specialists/scene-flow.png",
  money: "/images/for-specialists/scene-result.png",
};

function LeadIllustration({
  variant,
  alt,
  className = "",
  priority = false,
}: {
  variant: IllustrationVariant;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`relative aspect-[3/2] w-full overflow-hidden bg-gray-50 ${className}`}>
      <Image
        src={illustrationSrc[variant]}
        alt={alt}
        width={1152}
        height={864}
        priority={priority}
        className="h-full w-full object-cover object-center"
      />
    </div>
  );
}

export async function ForSpecialistsView({ lang }: Props) {
  const copy = CURRENT_FOR_SPECIALISTS_COPY[lang];
  const becomeHref = `/${lang}/become-specialist`;

  return (
    <main className="bg-white text-gray-950">
      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-20 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:pb-24 lg:pt-24">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">{copy.hero.eyebrow}</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">{copy.hero.headline}</h1>
          <p className="mt-6 max-w-2xl text-xl leading-8 text-gray-700">{copy.hero.sub}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={becomeHref} className="inline-flex h-12 items-center justify-center rounded-lg bg-emerald-600 px-7 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700">{copy.hero.cta}</Link>
            <a href="#how-it-works" className="inline-flex h-12 items-center justify-center rounded-lg border border-gray-300 px-7 text-base font-semibold text-gray-950 transition hover:border-gray-950">{copy.hero.secondaryCta}</a>
          </div>
          <p className="mt-5 max-w-xl text-sm leading-6 text-gray-500">{copy.hero.note}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
          <LeadIllustration variant="stress" alt={copy.illustration.alt} priority />
          <div className="grid grid-cols-3 gap-2 border-t border-gray-200 pt-4 text-center text-sm font-semibold text-gray-700">
            {copy.illustration.tags.map((tag) => <span key={tag}>{tag}</span>)}
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
          <LeadIllustration variant="requests" alt={copy.illustration.alt} />
          <p className="border-t border-gray-200 pt-4 text-center text-lg font-semibold">{copy.problem.caption}</p>
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
          <Link href={becomeHref} className="mt-10 inline-flex h-12 items-center justify-center rounded-lg bg-emerald-500 px-7 text-base font-semibold text-gray-950 transition hover:bg-emerald-400">{copy.hero.cta}</Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <LeadIllustration variant="flow" alt={copy.illustration.alt} />
        </div>
        <div>
          <h2 className="text-3xl font-bold sm:text-4xl">{copy.seo.title}</h2>
          <p className="mt-5 text-lg leading-8 text-gray-700">{copy.seo.intro}</p>
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
          <LeadIllustration variant="money" alt={copy.illustration.alt} />
          <p className="border-t border-gray-200 pt-4 text-center text-lg font-semibold">{copy.offer.caption}</p>
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
        <Link href={becomeHref} className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-white px-8 text-base font-bold text-emerald-700 transition hover:bg-emerald-50">{copy.finalCta.button}</Link>
      </section>
    </main>
  );
}
