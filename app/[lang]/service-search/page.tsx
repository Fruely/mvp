import { isSupportedLang, type Lang } from "@/lib/i18n";

const translations: Record<
  Lang,
  {
    headline: string;
    cta: string;
  }
> = {
  ru: {
    headline: "Какую услугу вы ищете?",
    cta: "Начать поиск",
  },
  ua: {
    headline: "Яку послугу ви шукаєте?",
    cta: "Почати пошук",
  },
  de: {
    headline: "Welche Dienstleistung suchen Sie?",
    cta: "Suche starten",
  },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: { lang: string } }) {
  const lang: Lang = isSupportedLang(params.lang) ? params.lang : "ua";

  return {
    title: `${translations[lang].headline} | Freuly`,
    description: "Find the perfect service on Freuly",
  };
}

export default function ServiceSearchPage({
  params,
}: {
  params: { lang: string };
}) {
  const lang: Lang = isSupportedLang(params.lang) ? params.lang : "ua";
  const t = translations[lang];

  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-textPrimary mb-8 leading-tight">
          {t.headline}
        </h1>

        <button type="button" className="btn-primary px-8 py-4 text-lg">
          {t.cta}
        </button>
      </div>
    </main>
  );
}
