import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, isSupportedLang, t, type Lang } from "@/lib/i18n";
import { SPECIALIST_RULES_METADATA, SITE_DOMAIN, hreflangSpecialistRules } from "@/lib/seo/siteMetadata";

export const dynamic = "force-dynamic";

type RuleItem = { title: string; body: string };

type SpecialistRulesDict = {
  title: string;
  intro: string;
  closing: string;
  rules: RuleItem[];
};

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const lang =
    params.lang === "ua" || params.lang === "ru" || params.lang === "de" ? params.lang : "ua";
  const seo = SPECIALIST_RULES_METADATA[lang];
  const canonical = `${SITE_DOMAIN}/${lang}/specialist-rules`;
  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical,
      languages: { ...hreflangSpecialistRules() },
    },
  };
}

export default async function SpecialistRulesPage({
  params,
}: {
  params: { lang: string };
}) {
  const lang: Lang = isSupportedLang(params.lang) ? params.lang : "ua";
  const dict = await getDictionary(lang);
  const sr = dict.specialistRules as SpecialistRulesDict | undefined;
  if (!sr?.rules?.length) {
    return null;
  }

  const back = t(dict, "specialistRules.backToHome", { defaultValue: "← На головну" });

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href={`/${lang}`}
        className="mb-8 inline-block font-medium text-blue-600 hover:text-blue-700"
      >
        {back}
      </Link>

      <article className="prose prose-gray max-w-none">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">{sr.title}</h1>
        <p className="text-lg text-gray-700">{sr.intro}</p>

        <ol className="mt-8 list-decimal space-y-8 pl-5 marker:font-semibold">
          {sr.rules.map((rule, i) => (
            <li key={i} className="pl-2">
              <h2 className="mb-2 text-xl font-semibold text-gray-900">{rule.title}</h2>
              <p className="text-gray-700 leading-relaxed">{rule.body}</p>
            </li>
          ))}
        </ol>

        <p className="mt-10 border-t border-gray-200 pt-8 text-gray-800">{sr.closing}</p>
      </article>
    </div>
  );
}
