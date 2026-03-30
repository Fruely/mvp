import Link from "next/link";
import { isSupportedLang, type Lang } from "@/lib/i18n";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";

export const dynamic = "force-dynamic";

const DOMAIN = process.env.APP_URL || "https://freuly.de";

const SUBCATEGORIES = [
  { slug: "seniorenbetreuung", de: "Seniorenbetreuung", ru: "Уход за пожилыми", ua: "Догляд за літніми" },
  { slug: "krankenpflege", de: "Krankenpflege", ru: "Медицинский уход", ua: "Медичний догляд" },
  { slug: "alltagshilfe", de: "Alltagshilfe", ru: "Помощь в быту", ua: "Допомога в побуті" },
  { slug: "kinderbetreuung", de: "Kinderbetreuung", ru: "Присмотр за детьми", ua: "Догляд за дітьми" },
  { slug: "haushaltshilfe", de: "Haushaltshilfe", ru: "Домашняя помощь", ua: "Домашня допомога" },
  { slug: "begleitdienst", de: "Begleitdienst", ru: "Сопровождение", ua: "Супровід" },
];

const CROSS_LINKS = [
  { href: "psychologists-germany", de: "Psychologen", ru: "Психологи", ua: "Психологи" },
  { href: "cleaning", de: "Reinigung", ru: "Уборка", ua: "Прибирання" },
  { href: "nutritionists", de: "Ernährungsberater", ru: "Нутрициологи", ua: "Нутриціологи" },
  { href: "housemaster", de: "Hausmeister", ru: "Мастер на дом", ua: "Майстер додому" },
];

function label(item: { de: string; ru: string; ua: string }, lang: Lang) {
  if (lang === "de") return item.de;
  if (lang === "ua") return item.ua;
  return item.ru;
}

export async function generateMetadata({ params }: { params: { lang: string } }) {
  const lang = isSupportedLang(params.lang) ? (params.lang as Lang) : "de";
  return {
    title: "Pflege & Betreuung in Deutschland | Freuly",
    description:
      "Finden Sie Pflegekräfte und Betreuung für Senioren und Patienten. Alltagshilfe, Krankenpflege und Unterstützung zu Hause.",
    alternates: {
      canonical: `${DOMAIN}/${lang}/pflege-betreuung`,
      languages: {
        de: `${DOMAIN}/de/pflege-betreuung`,
        ru: `${DOMAIN}/ru/pflege-betreuung`,
        ua: `${DOMAIN}/ua/pflege-betreuung`,
        "x-default": `${DOMAIN}/de/pflege-betreuung`,
      },
    },
  };
}

export default async function PflegeBetreuungPage({
  params,
}: {
  params: { lang: string };
}) {
  if (!isSupportedLang(params.lang)) {
    redirect("/de/pflege-betreuung");
  }

  const lang = params.lang as Lang;

  const supabase = createSupabaseServerClient();
  const { data: specialists } = await supabase
    .from("specialists")
    .select("id, slug, name, city, postal_code, bio, avatar_url, languages, work_format")
    .eq("is_active", true)
    .eq("is_visible", true)
    .in("status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
    .or("category.ilike.%pflege%,category.ilike.%betreuung%,category.ilike.%care%")
    .limit(12);

  const specs = specialists ?? [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {/* H1 */}
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        Pflege &amp; Betreuung in Deutschland
      </h1>

      <p className="mt-6 text-base leading-relaxed text-gray-700">
        {lang === "de"
          ? "Finden Sie qualifizierte Pflegekräfte und Betreuungspersonal in Ihrer Nähe. Ob Seniorenbetreuung, Krankenpflege oder Alltagshilfe — auf Freuly verbinden wir Sie mit erfahrenen Spezialisten, die Ihre Sprache sprechen."
          : lang === "ua"
            ? "Знайдіть кваліфікованих доглядальників та помічників у вашому регіоні. Dogляд за літніми, медичний догляд чи допомога в побуті — на Freuly ми з'єднуємо вас із досвідченими спеціалістами, які розмовляють вашою мовою."
            : "Найдите квалифицированных специалистов по уходу и помощи в вашем регионе. Уход за пожилыми, медицинский уход или помощь в быту — на Freuly мы соединяем вас с опытными специалистами, которые говорят на вашем языке."}
      </p>

      {/* Subcategories grid */}
      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-gray-900">
          {lang === "de" ? "Bereiche" : lang === "ua" ? "Напрямки" : "Направления"}
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SUBCATEGORIES.map((sub) => (
            <Link
              key={sub.slug}
              href={`/${lang}/search?category=${sub.slug}`}
              className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 transition-shadow hover:shadow-md"
            >
              {label(sub, lang)}
            </Link>
          ))}
        </div>
      </section>

      {/* Specialists */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-gray-900">
          {lang === "de"
            ? "Verfügbare Spezialisten"
            : lang === "ua"
              ? "Доступні спеціалісти"
              : "Доступные специалисты"}
        </h2>

        {specs.length > 0 ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {specs.map((s) => (
              <Link
                key={s.id}
                href={`/${lang}/specialist/${s.slug || s.id}`}
                className="group flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg font-semibold text-gray-500">
                  {(s.name ?? "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">{s.name}</p>
                  <p className="text-sm text-gray-500">
                    {s.city}
                    {s.postal_code ? `, ${s.postal_code}` : ""}
                  </p>
                  {s.bio && (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">{s.bio}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-gray-500 italic">
            {lang === "de"
              ? "Die Liste der Spezialisten in dieser Kategorie wird hier erscheinen, sobald die Freuly-Datenbank wächst."
              : lang === "ua"
                ? "Список спеціалістів цієї категорії з'явиться тут у міру розширення бази Freuly."
                : "Список специалистов этой категории появится здесь по мере расширения базы Freuly."}
          </p>
        )}
      </section>

      {/* SEO text block */}
      <article className="mt-14 space-y-8 text-base leading-relaxed text-gray-700">
        <section>
          <h2 className="text-2xl font-semibold text-gray-900">
            Pflege und Betreuung in Deutschland — was Sie wissen sollten
          </h2>
          <p className="mt-3">
            Die Pflege und Betreuung von Angehörigen ist eine der größten Herausforderungen, mit denen
            Familien in Deutschland konfrontiert werden. Ob es um die Versorgung älterer Eltern geht, um
            die Unterstützung eines kranken Familienmitglieds oder um die tägliche Betreuung von Kindern —
            die Suche nach einer zuverlässigen Pflegekraft ist oft schwierig und zeitaufwendig.
          </p>
          <p className="mt-3">
            Besonders für Menschen mit Migrationshintergrund kommt eine zusätzliche Hürde hinzu: die
            Sprachbarriere. Wenn die Pflegekraft die Muttersprache des Patienten spricht, entsteht
            Vertrauen schneller, Missverständnisse werden vermieden und die Qualität der Betreuung
            steigt erheblich.
          </p>
          <p className="mt-3">
            Auf Freuly finden Sie Pflegekräfte und Betreuungspersonal, die Ukrainisch, Russisch und
            Deutsch sprechen. Alle Spezialisten sind in Deutschland ansässig und bieten ihre Dienste
            sowohl vor Ort als auch online an.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900">
            Seniorenbetreuung — würdevolle Pflege im Alter
          </h2>
          <p className="mt-3">
            Die{" "}
            <Link href={`/${lang}/search?category=seniorenbetreuung`} className="text-blue-600 hover:underline">
              Seniorenbetreuung
            </Link>{" "}
            umfasst weit mehr als nur medizinische Versorgung. Es geht um Begleitung im Alltag,
            emotionale Unterstützung und die Wahrung der Lebensqualität. Unsere Spezialisten helfen bei:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>Täglicher Körperpflege und Hygiene</li>
            <li>Begleitung zu Arztterminen und Behördengängen</li>
            <li>Einkäufen und Haushaltsführung</li>
            <li>Gesellschaft und emotionaler Unterstützung</li>
            <li>Erinnerungspflege und kognitiver Aktivierung</li>
          </ul>
          <p className="mt-3">
            Gerade bei Demenz oder Alzheimer ist es entscheidend, dass die Betreuungsperson die
            Muttersprache des Patienten spricht. Erinnerungen, Gefühle und Bedürfnisse lassen sich
            in der eigenen Sprache am besten ausdrücken.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900">
            Krankenpflege — professionelle Unterstützung zu Hause
          </h2>
          <p className="mt-3">
            Die{" "}
            <Link href={`/${lang}/search?category=krankenpflege`} className="text-blue-600 hover:underline">
              Krankenpflege
            </Link>{" "}
            zu Hause gewinnt in Deutschland zunehmend an Bedeutung. Immer mehr Patienten bevorzugen
            es, in ihrer vertrauten Umgebung gepflegt zu werden, anstatt in ein Pflegeheim zu ziehen.
          </p>
          <p className="mt-3">
            Qualifizierte Pflegekräfte übernehmen Aufgaben wie Medikamentenvergabe, Wundversorgung,
            Blutdruckmessung und die Koordination mit behandelnden Ärzten. Dabei ist eine klare
            Kommunikation zwischen Patient und Pflegekraft unerlässlich — Missverständnisse bei
            der Medikation oder bei Symptomen können schwerwiegende Folgen haben.
          </p>
          <p className="mt-3">
            Auf Freuly finden Sie Pflegekräfte, die nicht nur fachlich qualifiziert sind, sondern
            auch Ihre Sprache sprechen und Ihre kulturellen Bedürfnisse verstehen.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900">
            Alltagshilfe — kleine Unterstützung, große Wirkung
          </h2>
          <p className="mt-3">
            Nicht immer ist eine umfassende Pflege notwendig. Oft reicht eine{" "}
            <Link href={`/${lang}/search?category=alltagshilfe`} className="text-blue-600 hover:underline">
              Alltagshilfe
            </Link>
            , um den Alltag deutlich zu erleichtern. Dazu gehören:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>Hilfe beim Kochen und bei der Essenszubereitung</li>
            <li>Unterstützung beim An- und Auskleiden</li>
            <li>Begleitung bei Spaziergängen und Freizeitaktivitäten</li>
            <li>Erledigung von Einkäufen und Post</li>
            <li>Leichte Hausarbeit und Ordnung halten</li>
          </ul>
          <p className="mt-3">
            Besonders für ältere Menschen, die noch relativ selbstständig sind, aber gelegentlich
            Unterstützung brauchen, ist die Alltagshilfe eine ideale Lösung. Sie bewahrt die
            Unabhängigkeit und gibt gleichzeitig Sicherheit.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900">
            Warum Freuly für Pflege und Betreuung?
          </h2>
          <p className="mt-3">
            Freuly ist eine Plattform, die speziell für die ukrainische und russischsprachige
            Community in Deutschland entwickelt wurde. Wir verstehen die besonderen Bedürfnisse
            von Menschen, die in einem neuen Land leben und Unterstützung suchen.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>Spezialisten sprechen Ukrainisch, Russisch und Deutsch</li>
            <li>Profile mit detaillierten Informationen zu Qualifikation und Erfahrung</li>
            <li>Transparente Bewertungen und Empfehlungen</li>
            <li>Einfache Kontaktaufnahme direkt über die Plattform</li>
            <li>Sowohl Vor-Ort- als auch Online-Betreuung verfügbar</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900">
            So finden Sie die richtige Pflegekraft
          </h2>
          <p className="mt-3">
            Bei der Wahl einer Pflegekraft sollten Sie folgende Punkte beachten:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li><strong>Sprachkenntnisse:</strong> Stellen Sie sicher, dass die Pflegekraft die Sprache Ihres Angehörigen spricht</li>
            <li><strong>Erfahrung:</strong> Fragen Sie nach Referenzen und bisheriger Berufserfahrung</li>
            <li><strong>Verfügbarkeit:</strong> Klären Sie Arbeitszeiten und Flexibilität im Voraus</li>
            <li><strong>Qualifikation:</strong> Achten Sie auf relevante Ausbildungen und Zertifikate</li>
            <li><strong>Persönliche Chemie:</strong> Ein Kennenlerngespräch hilft, die richtige Person zu finden</li>
          </ul>
          <p className="mt-3">
            Auf Freuly können Sie mehrere Profile vergleichen, Bewertungen lesen und direkt
            Kontakt aufnehmen — alles auf einer Plattform.
          </p>
        </section>
      </article>

      {/* CTA */}
      <section className="mt-12 rounded-2xl bg-teal-50 px-6 py-10 text-center">
        <h2 className="text-xl font-semibold text-gray-900">
          {lang === "de"
            ? "Bereit, die passende Pflegekraft zu finden?"
            : lang === "ua"
              ? "Готові знайти відповідного спеціаліста з догляду?"
              : "Готовы найти подходящего специалиста по уходу?"}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-gray-600">
          {lang === "de"
            ? "Durchsuchen Sie unsere Datenbank und finden Sie Betreuungspersonal in Ihrer Nähe."
            : lang === "ua"
              ? "Перегляньте нашу базу та знайдіть доглядальника поруч з вами."
              : "Просмотрите нашу базу и найдите специалиста рядом с вами."}
        </p>
        <Link
          href={`/${lang}/search?category=pflege-betreuung`}
          className="mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-teal-600 px-8 text-base font-semibold text-white transition hover:bg-teal-700"
        >
          {lang === "de"
            ? "Pflegekraft finden"
            : lang === "ua"
              ? "Знайти спеціаліста"
              : "Найти специалиста"}
        </Link>
      </section>

      {/* Cross-links */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-gray-900">
          {lang === "de"
            ? "Weitere Kategorien"
            : lang === "ua"
              ? "Інші категорії"
              : "Другие категории"}
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {CROSS_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={`/${lang}/${link.href}`}
                className="text-blue-600 hover:underline"
              >
                {label(link, lang)}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Footer links */}
      <section className="mt-10 border-t border-gray-200 pt-8">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {lang === "de" ? "Siehe auch" : lang === "ua" ? "Дивіться також" : "Смотрите также"}
        </h3>
        <nav className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href={`/${lang}`} className="text-blue-600 hover:underline">
            {lang === "de" ? "Startseite" : lang === "ua" ? "Головна" : "Главная"}
          </Link>
          <Link href="/specialists" className="text-blue-600 hover:underline">
            {lang === "de" ? "Alle Spezialisten" : lang === "ua" ? "Усі спеціалісти" : "Все специалисты"}
          </Link>
          <Link href="/for-specialists" className="text-blue-600 hover:underline">
            {lang === "de" ? "Spezialist werden" : lang === "ua" ? "Стати спеціалістом" : "Стать специалистом"}
          </Link>
        </nav>
      </section>
    </main>
  );
}
