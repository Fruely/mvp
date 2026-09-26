import { resolveRouteLang, type Lang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const COPY: Record<Lang, { title: string; body: string }> = {
  ru: {
    title: "Ссылка недействительна",
    body: "Откройте письмо от Freuly и перейдите по свежей ссылке.",
  },
  ua: {
    title: "Посилання недійсне",
    body: "Відкрийте лист від Freuly і перейдіть за свіжим посиланням.",
  },
  de: {
    title: "Der Link ist ungültig",
    body: "Öffnen Sie die E-Mail von Freuly und verwenden Sie den aktuellen Link.",
  },
};

export default async function UnavailableRequestPage({
  params,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
}) {
  const resolved = await Promise.resolve(params);
  const lang = resolveRouteLang(resolved.lang);
  const copy = COPY[lang];
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-gray-900">{copy.title}</h1>
      <p className="mt-3 text-sm text-gray-600">{copy.body}</p>
    </main>
  );
}
