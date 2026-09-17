import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ClientDemandEntry from "@/components/serviceRequests/ClientDemandEntry";
import { isSupportedLang, type Lang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const TITLE: Record<Lang, string> = {
  ru: "Поставить задачу | Freuly",
  ua: "Поставити завдання | Freuly",
  de: "Aufgabe stellen | Freuly",
};

const DESCRIPTION: Record<Lang, string> = {
  ru: "Опишите задачу — Freuly подберёт подходящего специалиста.",
  ua: "Опишіть завдання — Freuly підбере відповідного спеціаліста.",
  de: "Beschreiben Sie Ihre Aufgabe – Freuly findet eine passende Fachkraft.",
};

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
  if (!isSupportedLang(params.lang)) {
    return { robots: { index: false, follow: false } };
  }
  const lang = params.lang as Lang;
  return {
    title: TITLE[lang],
    description: DESCRIPTION[lang],
    robots: { index: false, follow: false },
  };
}

export default function ClientRequestEntryPage({ params }: { params: { lang: string } }) {
  if (!isSupportedLang(params.lang)) notFound();
  const lang = params.lang as Lang;

  return (
    <main className="min-h-[100dvh] bg-[#f8f7f5] px-freuly-4 py-8 sm:px-freuly-6 sm:py-12">
      <div className="mx-auto mb-8 flex max-w-2xl items-center justify-center">
        <div className="text-2xl font-black tracking-tight text-freuly-text-primary">Freuly</div>
      </div>
      <ClientDemandEntry lang={lang} />
    </main>
  );
}
