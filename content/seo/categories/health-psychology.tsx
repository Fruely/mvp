import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import type { ReactNode } from "react";
import type { CategorySeoMeta, LangLabel } from "@/components/seo/CategorySeoPage";

export const SLUG = "health-psychology";
export const FILTER_OR =
  "category.ilike.%psycholog%,category.ilike.%coach%,category.ilike.%gesundheit%,category.ilike.%health%,category.ilike.%therapy%";

export const META: Record<Lang, CategorySeoMeta> = {
  de: {
    metaTitle: "Psychologie & Gesundheit in Deutschland | Freuly",
    metaDescription:
      "Finden Sie Psychologen und Coaches, die Ihre Sprache sprechen. Psychologische Unterst\u00fctzung, Coaching und Beratung auf Freuly.",
    h1: "Psychologie & Gesundheit \u2014 Spezialisten in Ihrer Sprache",
    intro:
      "Finden Sie Psychologen und Coaches, die Ihre Sprache sprechen. Psychologische Unterst\u00fctzung, Coaching und Beratung \u2014 auf Freuly verbinden wir Sie mit erfahrenen Spezialisten, die Ukrainisch, Russisch und Deutsch sprechen.",
    areasTitle: "Bereiche",
    specialistsTitle: "Verf\u00fcgbare Spezialisten",
    specialistsEmpty:
      "Die Liste der Spezialisten in dieser Kategorie wird hier erscheinen, sobald die Freuly-Datenbank w\u00e4chst.",
    ctaHeading: "Bereit, Unterst\u00fctzung zu finden?",
    ctaText: "Durchsuchen Sie unsere Datenbank und finden Sie den passenden Spezialisten.",
    ctaButton: "Spezialisten finden",
    otherTitle: "Weitere Kategorien",
    seeAlso: "Siehe auch",
    home: "Startseite",
    allSpecialists: "Alle Spezialisten",
    becomeSpecialist: "Spezialist werden",
  },
  ru: {
    metaTitle: "\u041f\u0441\u0438\u0445\u043e\u043b\u043e\u0433\u0438\u044f \u0438 \u0437\u0434\u043e\u0440\u043e\u0432\u044c\u0435 \u0432 \u0413\u0435\u0440\u043c\u0430\u043d\u0438\u0438 | Freuly",
    metaDescription:
      "\u041d\u0430\u0439\u0434\u0438\u0442\u0435 \u043f\u0441\u0438\u0445\u043e\u043b\u043e\u0433\u043e\u0432 \u0438 \u0441\u043f\u0435\u0446\u0438\u0430\u043b\u0438\u0441\u0442\u043e\u0432. \u041f\u0441\u0438\u0445\u043e\u043b\u043e\u0433\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u043f\u043e\u043c\u043e\u0449\u044c \u0438 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430 \u043d\u0430 Freuly.",
    h1: "\u041f\u0441\u0438\u0445\u043e\u043b\u043e\u0433\u0438\u044f \u0438 \u0437\u0434\u043e\u0440\u043e\u0432\u044c\u0435 \u2014 \u0441\u043f\u0435\u0446\u0438\u0430\u043b\u0438\u0441\u0442\u044b \u043d\u0430 \u0432\u0430\u0448\u0435\u043c \u044f\u0437\u044b\u043a\u0435",
    intro:
      "\u041d\u0430\u0439\u0434\u0438\u0442\u0435 \u043f\u0441\u0438\u0445\u043e\u043b\u043e\u0433\u043e\u0432 \u0438 \u0441\u043f\u0435\u0446\u0438\u0430\u043b\u0438\u0441\u0442\u043e\u0432. \u041f\u0441\u0438\u0445\u043e\u043b\u043e\u0433\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u043f\u043e\u043c\u043e\u0449\u044c \u0438 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430 \u2014 \u043d\u0430 Freuly \u0432\u044b \u043d\u0430\u0439\u0434\u0451\u0442\u0435 \u044d\u043a\u0441\u043f\u0435\u0440\u0442\u043e\u0432, \u043a\u043e\u0442\u043e\u0440\u044b\u0435 \u0433\u043e\u0432\u043e\u0440\u044f\u0442 \u043d\u0430 \u0443\u043a\u0440\u0430\u0438\u043d\u0441\u043a\u043e\u043c, \u0440\u0443\u0441\u0441\u043a\u043e\u043c \u0438 \u043d\u0435\u043c\u0435\u0446\u043a\u043e\u043c.",
    areasTitle: "\u041d\u0430\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u044f",
    specialistsTitle: "\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u0435 \u0441\u043f\u0435\u0446\u0438\u0430\u043b\u0438\u0441\u0442\u044b",
    specialistsEmpty:
      "\u0421\u043f\u0438\u0441\u043e\u043a \u0441\u043f\u0435\u0446\u0438\u0430\u043b\u0438\u0441\u0442\u043e\u0432 \u044d\u0442\u043e\u0439 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438 \u043f\u043e\u044f\u0432\u0438\u0442\u0441\u044f \u0437\u0434\u0435\u0441\u044c \u043f\u043e \u043c\u0435\u0440\u0435 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043d\u0438\u044f \u0431\u0430\u0437\u044b Freuly.",
    ctaHeading: "\u0413\u043e\u0442\u043e\u0432\u044b \u043d\u0430\u0439\u0442\u0438 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0443?",
    ctaText: "\u041f\u0440\u043e\u0441\u043c\u043e\u0442\u0440\u0438\u0442\u0435 \u0431\u0430\u0437\u0443 \u0438 \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u043f\u0435\u0446\u0438\u0430\u043b\u0438\u0441\u0442\u0430.",
    ctaButton: "\u041d\u0430\u0439\u0442\u0438 \u0441\u043f\u0435\u0446\u0438\u0430\u043b\u0438\u0441\u0442\u0430",
    otherTitle: "\u0414\u0440\u0443\u0433\u0438\u0435 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438",
    seeAlso: "\u0421\u043c\u043e\u0442\u0440\u0438\u0442\u0435 \u0442\u0430\u043a\u0436\u0435",
    home: "\u0413\u043b\u0430\u0432\u043d\u0430\u044f",
    allSpecialists: "\u0412\u0441\u0435 \u0441\u043f\u0435\u0446\u0438\u0430\u043b\u0438\u0441\u0442\u044b",
    becomeSpecialist: "\u0421\u0442\u0430\u0442\u044c \u0441\u043f\u0435\u0446\u0438\u0430\u043b\u0438\u0441\u0442\u043e\u043c",
  },
  ua: {
    metaTitle: "\u041f\u0441\u0438\u0445\u043e\u043b\u043e\u0433\u0456\u044f \u0456 \u0437\u0434\u043e\u0440\u043e\u0432\u2019\u044f \u0443 \u041d\u0456\u043c\u0435\u0447\u0447\u0438\u043d\u0456 | Freuly",
    metaDescription:
      "\u0417\u043d\u0430\u0439\u0434\u0456\u0442\u044c \u043f\u0441\u0438\u0445\u043e\u043b\u043e\u0433\u0456\u0432 \u0442\u0430 \u043a\u043e\u0443\u0447\u0456\u0432. \u041f\u0441\u0438\u0445\u043e\u043b\u043e\u0433\u0456\u0447\u043d\u0430 \u043f\u0456\u0434\u0442\u0440\u0438\u043c\u043a\u0430 \u043d\u0430 Freuly.",
    h1: "\u041f\u0441\u0438\u0445\u043e\u043b\u043e\u0433\u0456\u044f \u0456 \u0437\u0434\u043e\u0440\u043e\u0432\u2019\u044f \u2014 \u0441\u043f\u0435\u0446\u0456\u0430\u043b\u0456\u0441\u0442\u0438 \u0432\u0430\u0448\u043e\u044e \u043c\u043e\u0432\u043e\u044e",
    intro:
      "\u0417\u043d\u0430\u0439\u0434\u0456\u0442\u044c \u043f\u0441\u0438\u0445\u043e\u043b\u043e\u0433\u0456\u0432 \u0442\u0430 \u043a\u043e\u0443\u0447\u0456\u0432. \u041f\u0441\u0438\u0445\u043e\u043b\u043e\u0433\u0456\u0447\u043d\u0430 \u043f\u0456\u0434\u0442\u0440\u0438\u043c\u043a\u0430 \u2014 \u043d\u0430 Freuly \u0432\u0438 \u0437\u043d\u0430\u0439\u0434\u0435\u0442\u0435 \u0441\u043f\u0435\u0446\u0456\u0430\u043b\u0456\u0441\u0442\u0456\u0432, \u044f\u043a\u0456 \u0440\u043e\u0437\u043c\u043e\u0432\u043b\u044f\u044e\u0442\u044c \u0443\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u043e\u044e, \u0440\u043e\u0441\u0456\u0439\u0441\u044c\u043a\u043e\u044e \u0442\u0430 \u043d\u0456\u043c\u0435\u0446\u044c\u043a\u043e\u044e.",
    areasTitle: "\u041d\u0430\u043f\u0440\u044f\u043c\u043a\u0438",
    specialistsTitle: "\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u0456 \u0441\u043f\u0435\u0446\u0456\u0430\u043b\u0456\u0441\u0442\u0438",
    specialistsEmpty:
      "\u0421\u043f\u0438\u0441\u043e\u043a \u0441\u043f\u0435\u0446\u0456\u0430\u043b\u0456\u0441\u0442\u0456\u0432 \u0446\u0456\u0454\u0457 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u0457 \u0437\u2019\u044f\u0432\u0438\u0442\u044c\u0441\u044f \u0442\u0443\u0442 \u0443 \u043c\u0456\u0440\u0443 \u0440\u043e\u0437\u0448\u0438\u0440\u0435\u043d\u043d\u044f \u0431\u0430\u0437\u0438 Freuly.",
    ctaHeading: "\u0413\u043e\u0442\u043e\u0432\u0456 \u0437\u043d\u0430\u0439\u0442\u0438 \u043f\u0456\u0434\u0442\u0440\u0438\u043c\u043a\u0443?",
    ctaText: "\u041f\u0435\u0440\u0435\u0433\u043b\u044f\u043d\u044c\u0442\u0435 \u0431\u0430\u0437\u0443 \u0442\u0430 \u043e\u0431\u0435\u0440\u0456\u0442\u044c \u0441\u043f\u0435\u0446\u0456\u0430\u043b\u0456\u0441\u0442\u0430.",
    ctaButton: "\u0417\u043d\u0430\u0439\u0442\u0438 \u0441\u043f\u0435\u0446\u0456\u0430\u043b\u0456\u0441\u0442\u0430",
    otherTitle: "\u0406\u043d\u0448\u0456 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u0457",
    seeAlso: "\u0414\u0438\u0432\u0456\u0442\u044c\u0441\u044f \u0442\u0430\u043a\u043e\u0436",
    home: "\u0413\u043e\u043b\u043e\u0432\u043d\u0430",
    allSpecialists: "\u0423\u0441\u0456 \u0441\u043f\u0435\u0446\u0456\u0430\u043b\u0456\u0441\u0442\u0438",
    becomeSpecialist: "\u0421\u0442\u0430\u0442\u0438 \u0441\u043f\u0435\u0446\u0456\u0430\u043b\u0456\u0441\u0442\u043e\u043c",
  },
};

export const SUBCATEGORIES: (LangLabel & { slug: string })[] = [
  {
    slug: "psychologists",
    de: "Psychologen",
    ru: "\u041f\u0441\u0438\u0445\u043e\u043b\u043e\u0433\u0438",
    ua: "\u041f\u0441\u0438\u0445\u043e\u043b\u043e\u0433\u0438",
  },
  {
    slug: "psychotherapists",
    de: "Psychotherapeut:innen",
    ru: "\u041f\u0441\u0438\u0445\u043e\u0442\u0435\u0440\u0430\u043f\u0435\u0432\u0442\u044b",
    ua: "\u041f\u0441\u0438\u0445\u043e\u0442\u0435\u0440\u0430\u043f\u0435\u0432\u0442\u0438",
  },
  {
    slug: "coaches",
    de: "Coaches",
    ru: "\u041a\u043e\u0443\u0447\u0438",
    ua: "\u041a\u043e\u0443\u0447\u0456",
  },
  {
    slug: "nutritionists",
    de: "Ern\u00e4hrungsberatung",
    ru: "\u041d\u0443\u0442\u0440\u0438\u0446\u0438\u043e\u043b\u043e\u0433\u0438\u044f",
    ua: "\u041d\u0443\u0442\u0440\u0438\u0446\u0456\u043e\u043b\u043e\u0433\u0456\u044f",
  },
];

export const CROSS_LINKS: (LangLabel & { href: string })[] = [
  {
    href: "psychologists-germany",
    de: "Psychologen in Deutschland",
    ru: "\u041f\u0441\u0438\u0445\u043e\u043b\u043e\u0433\u0438 \u0432 \u0413\u0435\u0440\u043c\u0430\u043d\u0438\u0438",
    ua: "\u041f\u0441\u0438\u0445\u043e\u043b\u043e\u0433\u0438 \u0443 \u041d\u0456\u043c\u0435\u0447\u0447\u0438\u043d\u0456",
  },
  { href: "pflege-betreuung", de: "Pflege & Betreuung", ru: "\u0423\u0445\u043e\u0434 \u0438 \u0441\u043e\u043f\u0440\u043e\u0432\u043e\u0436\u0434\u0435\u043d\u0438\u0435", ua: "\u0414\u043e\u0433\u043b\u044f\u0434 \u0442\u0430 \u0441\u0443\u043f\u0440\u043e\u0432\u0456\u0434" },
  { href: "reisen-tourismus", de: "Reisen & Tourismus", ru: "\u0422\u0443\u0440\u0438\u0437\u043c \u0438 \u043f\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u0438\u044f", ua: "\u0422\u0443\u0440\u0438\u0437\u043c \u0456 \u043f\u043e\u0434\u043e\u0440\u043e\u0436\u0456" },
  { href: "retreats", de: "Retreats", ru: "\u0420\u0435\u0442\u0440\u0438\u0442\u044b", ua: "\u0420\u0435\u0442\u0440\u0438\u0442\u0438" },
];

function De({ lang }: { lang: string }): ReactNode {
  return (
    <>
      <section>
        <h2 className="text-2xl font-semibold text-gray-900">
          Psychologie &amp; Gesundheit &mdash; Unterst&uuml;tzung in Ihrer Sprache
        </h2>
        <p className="mt-3">
          Psychologische Unterst&uuml;tzung, Coaching und Beratung sind besonders wertvoll, wenn Sie mit einem
          Spezialisten in Ihrer Muttersprache sprechen k&ouml;nnen. Auf Freuly finden Sie{" "}
          <Link href={`/${lang}/category/psychologists`} className="text-blue-600 hover:underline">
            Psychologen
          </Link>
          , Coaches und Berater, die Ukrainisch, Russisch und Deutsch sprechen.
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-semibold text-gray-900">Psychologische Unterst&uuml;tzung und Coaching</h2>
        <p className="mt-3">
          Ob Krisenbew&auml;ltigung, Stressmanagement oder pers&ouml;nliche Entwicklung &mdash; die passende
          fachliche Begleitung kann den Unterschied machen. Nutzen Sie die Suche nach{" "}
          <Link href={`/${lang}/category/psychologists`} className="text-blue-600 hover:underline">
            Psychologen
          </Link>{" "}
          und verwandten Angeboten, um Profile zu vergleichen und Kontakt aufzunehmen.
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-semibold text-gray-900">Warum Freuly?</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>Spezialisten sprechen Ukrainisch, Russisch und Deutsch</li>
          <li>Transparente Profile</li>
          <li>Einfache Kontaktaufnahme &uuml;ber die Plattform</li>
        </ul>
      </section>
    </>
  );
}

function Ru({ lang }: { lang: string }): ReactNode {
  return (
    <>
      <section>
        <h2 className="text-2xl font-semibold text-gray-900">
          {"\u041f\u0441\u0438\u0445\u043e\u043b\u043e\u0433\u0438\u044f \u0438 \u0437\u0434\u043e\u0440\u043e\u0432\u044c\u0435"}
        </h2>
        <p className="mt-3">
          {"\u041f\u0441\u0438\u0445\u043e\u043b\u043e\u0433\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u043f\u043e\u043c\u043e\u0449\u044c \u0438 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430. \u041d\u0430 Freuly \u0432\u044b \u043d\u0430\u0439\u0434\u0451\u0442\u0435 "}
          <Link href={`/${lang}/category/psychologists`} className="text-blue-600 hover:underline">
            {"\u043f\u0441\u0438\u0445\u043e\u043b\u043e\u0433\u043e\u0432"}
          </Link>
          {" \u0438 \u0441\u043f\u0435\u0446\u0438\u0430\u043b\u0438\u0441\u0442\u043e\u0432, \u043a\u043e\u0442\u043e\u0440\u044b\u0435 \u0433\u043e\u0432\u043e\u0440\u044f\u0442 \u043d\u0430 \u0432\u0430\u0448\u0435\u043c \u044f\u0437\u044b\u043a\u0435."}
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-semibold text-gray-900">
          {"\u041a\u043e\u043d\u0441\u0443\u043b\u044c\u0442\u0430\u0446\u0438\u0438 \u0438 \u0440\u0430\u0437\u0432\u0438\u0442\u0438\u0435"}
        </h2>
        <p className="mt-3">
          {"\u0418\u043d\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043b\u044c\u043d\u044b\u0439 \u043f\u043e\u0434\u0445\u043e\u0434 \u043f\u043e\u043c\u043e\u0433\u0430\u0435\u0442 \u043f\u0440\u0438 \u0441\u0442\u0440\u0435\u0441\u0441\u0435, \u043f\u0435\u0440\u0435\u0435\u0437\u0434\u0435 \u0438\u043b\u0438 \u043f\u043e\u0438\u0441\u043a\u0435 \u0431\u0430\u043b\u0430\u043d\u0441\u0430. \u0418\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0439\u0442\u0435 \u043f\u043e\u0438\u0441\u043a \u043f\u043e "}
          <Link href={`/${lang}/category/psychologists`} className="text-blue-600 hover:underline">
            {"\u043f\u0441\u0438\u0445\u043e\u043b\u043e\u0433\u0430\u043c"}
          </Link>
          {" \u0434\u043b\u044f \u0432\u044b\u0431\u043e\u0440\u0430 \u0441\u043f\u0435\u0446\u0438\u0430\u043b\u0438\u0441\u0442\u0430."}
        </p>
      </section>
    </>
  );
}

function Ua({ lang }: { lang: string }): ReactNode {
  return (
    <>
      <section>
        <h2 className="text-2xl font-semibold text-gray-900">
          {"\u041f\u0441\u0438\u0445\u043e\u043b\u043e\u0433\u0456\u044f \u0456 \u0437\u0434\u043e\u0440\u043e\u0432\u2019\u044f"}
        </h2>
        <p className="mt-3">
          {"\u041f\u0441\u0438\u0445\u043e\u043b\u043e\u0433\u0456\u0447\u043d\u0430 \u043f\u0456\u0434\u0442\u0440\u0438\u043c\u043a\u0430. \u041d\u0430 Freuly \u0432\u0438 \u0437\u043d\u0430\u0439\u0434\u0435\u0442\u0435 "}
          <Link href={`/${lang}/category/psychologists`} className="text-blue-600 hover:underline">
            {"\u043f\u0441\u0438\u0445\u043e\u043b\u043e\u0433\u0456\u0432"}
          </Link>
          {" \u0442\u0430 \u043a\u043e\u0443\u0447\u0456\u0432, \u044f\u043a\u0456 \u0440\u043e\u0437\u043c\u043e\u0432\u043b\u044f\u044e\u0442\u044c \u0432\u0430\u0448\u043e\u044e \u043c\u043e\u0432\u043e\u044e."}
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-semibold text-gray-900">
          {"\u041a\u043e\u043d\u0441\u0443\u043b\u044c\u0442\u0430\u0446\u0456\u0457 \u0442\u0430 \u0440\u043e\u0437\u0432\u0438\u0442\u043e\u043a"}
        </h2>
        <p className="mt-3">
          {"\u0406\u043d\u0434\u0438\u0432\u0456\u0434\u0443\u0430\u043b\u044c\u043d\u0438\u0439 \u043f\u0456\u0434\u0445\u0456\u0434 \u0434\u043e\u043f\u043e\u043c\u0430\u0433\u0430\u0454 \u043f\u0440\u0438 \u0441\u0442\u0440\u0435\u0441\u0456 \u0442\u0430 \u043f\u0435\u0440\u0435\u0437\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0435\u043d\u043d\u0456. \u0412\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u043e\u0432\u0443\u0439\u0442\u0435 \u043f\u043e\u0448\u0443\u043a "}
          <Link href={`/${lang}/category/psychologists`} className="text-blue-600 hover:underline">
            {"\u043f\u0441\u0438\u0445\u043e\u043b\u043e\u0433\u0456\u0432"}
          </Link>
          {" \u0434\u043b\u044f \u0432\u0438\u0431\u043e\u0440\u0443 \u0441\u043f\u0435\u0446\u0456\u0430\u043b\u0456\u0441\u0442\u0430."}
        </p>
      </section>
    </>
  );
}

export function SeoContent({ lang }: { lang: string }): ReactNode {
  if (lang === "ru") return <Ru lang={lang} />;
  if (lang === "ua") return <Ua lang={lang} />;
  return <De lang={lang} />;
}
