import Link from "next/link";
import { isSupportedLang, type Lang } from "@/lib/i18n";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

const DOMAIN = process.env.APP_URL || "https://freuly.de";

/* ------------------------------------------------------------------ */
/*  UI copy                                                            */
/* ------------------------------------------------------------------ */

const COPY: Record<
  Lang,
  {
    metaTitle: string;
    metaDescription: string;
    h1: string;
    intro: string;
    areasTitle: string;
    specialistsTitle: string;
    specialistsEmpty: string;
    ctaHeading: string;
    ctaText: string;
    ctaButton: string;
    otherTitle: string;
    seeAlso: string;
    home: string;
    allSpecialists: string;
    becomeSpecialist: string;
  }
> = {
  de: {
    metaTitle: "Pflege & Betreuung in Deutschland | Freuly",
    metaDescription:
      "Finden Sie Pflegekräfte und Betreuung für Senioren und Patienten. Alltagshilfe, Krankenpflege und Unterstützung zu Hause.",
    h1: "Pflege & Betreuung in Deutschland",
    intro:
      "Finden Sie qualifizierte Pflegekräfte und Betreuungspersonal in Ihrer Nähe. Ob Seniorenbetreuung, Krankenpflege oder Alltagshilfe — auf Freuly verbinden wir Sie mit erfahrenen Spezialisten, die Ihre Sprache sprechen.",
    areasTitle: "Bereiche",
    specialistsTitle: "Verfügbare Spezialisten",
    specialistsEmpty:
      "Die Liste der Spezialisten in dieser Kategorie wird hier erscheinen, sobald die Freuly-Datenbank wächst.",
    ctaHeading: "Bereit, die passende Pflegekraft zu finden?",
    ctaText:
      "Durchsuchen Sie unsere Datenbank und finden Sie Betreuungspersonal in Ihrer Nähe.",
    ctaButton: "Pflegekraft finden",
    otherTitle: "Weitere Kategorien",
    seeAlso: "Siehe auch",
    home: "Startseite",
    allSpecialists: "Alle Spezialisten",
    becomeSpecialist: "Spezialist werden",
  },
  ru: {
    metaTitle: "Уход и сопровождение в Германии | Freuly",
    metaDescription:
      "Найдите специалистов по уходу за пожилыми людьми, больными и помощи в быту в Германии.",
    h1: "Уход и сопровождение в Германии",
    intro:
      "Найдите квалифицированных специалистов по уходу и помощи в вашем регионе. Уход за пожилыми, медицинский уход или помощь в быту — на Freuly мы соединяем вас с опытными специалистами, которые говорят на вашем языке.",
    areasTitle: "Направления",
    specialistsTitle: "Доступные специалисты",
    specialistsEmpty:
      "Список специалистов этой категории появится здесь по мере расширения базы Freuly.",
    ctaHeading: "Готовы найти подходящего специалиста по уходу?",
    ctaText:
      "Просмотрите нашу базу и найдите специалиста рядом с вами.",
    ctaButton: "Найти специалиста",
    otherTitle: "Другие категории",
    seeAlso: "Смотрите также",
    home: "Главная",
    allSpecialists: "Все специалисты",
    becomeSpecialist: "Стать специалистом",
  },
  ua: {
    metaTitle: "Догляд та супровід у Німеччині | Freuly",
    metaDescription:
      "Знайдіть спеціалістів з догляду за літніми людьми, хворими та побутової допомоги в Німеччині.",
    h1: "Догляд та супровід у Німеччині",
    intro:
      "Знайдіть кваліфікованих доглядальників та помічників у вашому регіоні. Догляд за літніми, медичний догляд чи допомога в побуті — на Freuly ми з\u2019єднуємо вас із досвідченими спеціалістами, які розмовляють вашою мовою.",
    areasTitle: "Напрямки",
    specialistsTitle: "Доступні спеціалісти",
    specialistsEmpty:
      "Список спеціалістів цієї категорії з\u2019явиться тут у міру розширення бази Freuly.",
    ctaHeading: "Готові знайти відповідного спеціаліста з догляду?",
    ctaText:
      "Перегляньте нашу базу та знайдіть доглядальника поруч з вами.",
    ctaButton: "Знайти спеціаліста",
    otherTitle: "Інші категорії",
    seeAlso: "Дивіться також",
    home: "Головна",
    allSpecialists: "Усі спеціалісти",
    becomeSpecialist: "Стати спеціалістом",
  },
};

/* ------------------------------------------------------------------ */
/*  Subcategory & cross-link labels                                    */
/* ------------------------------------------------------------------ */

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

function lbl(item: { de: string; ru: string; ua: string }, lang: Lang) {
  if (lang === "de") return item.de;
  if (lang === "ua") return item.ua;
  return item.ru;
}

/* ------------------------------------------------------------------ */
/*  SEO article content per language                                   */
/* ------------------------------------------------------------------ */

function SeoContentDe({ lang }: { lang: string }): ReactNode {
  return (
    <>
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
        <p className="mt-3">Bei der Wahl einer Pflegekraft sollten Sie folgende Punkte beachten:</p>
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
    </>
  );
}

function SeoContentRu({ lang }: { lang: string }): ReactNode {
  return (
    <>
      <section>
        <h2 className="text-2xl font-semibold text-gray-900">
          Уход и сопровождение в Германии — что важно знать
        </h2>
        <p className="mt-3">
          Уход за пожилыми родственниками или больными членами семьи — одна из самых серьёзных задач,
          с которой сталкиваются семьи, живущие в Германии. Найти надёжную сиделку или помощника по
          уходу, который говорит на вашем языке, непросто, но именно это делает процесс ухода
          комфортным и безопасным.
        </p>
        <p className="mt-3">
          Языковой барьер — ключевая проблема. Когда специалист по уходу говорит на родном языке
          пациента, доверие возникает быстрее, а риск недопонимания при приёме лекарств, описании
          симптомов или выполнении медицинских процедур сводится к минимуму.
        </p>
        <p className="mt-3">
          На платформе Freuly вы найдёте специалистов по уходу и сопровождению, которые говорят
          на украинском, русском и немецком языках. Все они работают в Германии и предлагают
          услуги как на дому, так и онлайн.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-gray-900">
          Уход за пожилыми — забота и достоинство
        </h2>
        <p className="mt-3">
          <Link href={`/${lang}/search?category=seniorenbetreuung`} className="text-blue-600 hover:underline">
            Уход за пожилыми
          </Link>{" "}
          включает гораздо больше, чем медицинские процедуры. Это повседневное сопровождение,
          эмоциональная поддержка и сохранение качества жизни. Наши специалисты помогают с:
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>Ежедневной гигиеной и уходом за телом</li>
          <li>Сопровождением к врачам и в учреждения</li>
          <li>Покупками и ведением домашнего хозяйства</li>
          <li>Общением и эмоциональной поддержкой</li>
          <li>Когнитивной активацией и поддержкой памяти</li>
        </ul>
        <p className="mt-3">
          При деменции или болезни Альцгеймера особенно важно, чтобы сиделка говорила на родном
          языке пациента. Воспоминания, чувства и потребности лучше всего выражаются на том языке,
          который человек знал с детства.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-gray-900">
          Медицинский уход на дому
        </h2>
        <p className="mt-3">
          <Link href={`/${lang}/search?category=krankenpflege`} className="text-blue-600 hover:underline">
            Уход за больными
          </Link>{" "}
          на дому становится всё более востребованным. Многие пациенты предпочитают оставаться
          дома, в привычной обстановке, вместо того чтобы переезжать в дом престарелых.
        </p>
        <p className="mt-3">
          Квалифицированные сиделки берут на себя раздачу лекарств, обработку ран, измерение
          давления и координацию с лечащими врачами. Чёткая коммуникация между пациентом и
          специалистом критически важна — ошибки при приёме лекарств или описании симптомов
          могут иметь серьёзные последствия.
        </p>
        <p className="mt-3">
          На Freuly вы найдёте специалистов, которые не только обладают профессиональной
          квалификацией, но и говорят на вашем языке и понимают вашу культуру.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-gray-900">
          Помощь в быту — маленькая поддержка, большой результат
        </h2>
        <p className="mt-3">
          Не всегда нужен полноценный медицинский уход. Часто достаточно{" "}
          <Link href={`/${lang}/search?category=alltagshilfe`} className="text-blue-600 hover:underline">
            помощи в быту
          </Link>
          , чтобы значительно облегчить повседневную жизнь:
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>Помощь с приготовлением еды</li>
          <li>Помощь с одеванием и гигиеной</li>
          <li>Сопровождение на прогулках</li>
          <li>Покупка продуктов и бытовых товаров</li>
          <li>Лёгкая уборка и поддержание порядка</li>
        </ul>
        <p className="mt-3">
          Для пожилых людей, которые ещё достаточно самостоятельны, но иногда нуждаются в помощи,
          бытовое сопровождение — идеальное решение. Оно сохраняет независимость и даёт уверенность
          в том, что рядом есть надёжный человек.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-gray-900">
          Почему Freuly для ухода и сопровождения?
        </h2>
        <p className="mt-3">
          Freuly — платформа, созданная специально для украинской и русскоязычной общины в Германии.
          Мы понимаем особые потребности людей, которые живут в новой стране и ищут поддержку.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>Специалисты говорят на украинском, русском и немецком</li>
          <li>Подробные профили с информацией о квалификации и опыте</li>
          <li>Прозрачные отзывы и рекомендации</li>
          <li>Простая связь со специалистом через платформу</li>
          <li>Услуги на дому и онлайн</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-gray-900">
          Как выбрать подходящего специалиста по уходу
        </h2>
        <p className="mt-3">При выборе сиделки или помощника обратите внимание на:</p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li><strong>Языки:</strong> убедитесь, что специалист говорит на языке вашего родственника</li>
          <li><strong>Опыт:</strong> запросите рекомендации и информацию о предыдущей работе</li>
          <li><strong>Доступность:</strong> уточните график работы и гибкость заранее</li>
          <li><strong>Квалификация:</strong> обратите внимание на образование и сертификаты</li>
          <li><strong>Личный контакт:</strong> ознакомительная встреча помогает понять, подходит ли вам человек</li>
        </ul>
        <p className="mt-3">
          На Freuly вы можете сравнить несколько профилей, прочитать отзывы и связаться со
          специалистом напрямую — всё на одной платформе.
        </p>
      </section>
    </>
  );
}

function SeoContentUa({ lang }: { lang: string }): ReactNode {
  return (
    <>
      <section>
        <h2 className="text-2xl font-semibold text-gray-900">
          Догляд та супровід у Німеччині — що важливо знати
        </h2>
        <p className="mt-3">
          Догляд за літніми родичами або хворими членами сім&apos;ї — одне з найскладніших завдань,
          з якими стикаються родини, що живуть у Німеччині. Знайти надійну доглядальницю або
          помічника, який розмовляє вашою мовою, непросто, але саме це робить процес догляду
          комфортним і безпечним.
        </p>
        <p className="mt-3">
          Мовний бар&apos;єр — ключова проблема. Коли спеціаліст з догляду розмовляє рідною мовою
          пацієнта, довіра виникає швидше, а ризик непорозумінь при прийомі ліків, описі
          симптомів або виконанні медичних процедур зводиться до мінімуму.
        </p>
        <p className="mt-3">
          На платформі Freuly ви знайдете спеціалістів з догляду та супроводу, які розмовляють
          українською, російською та німецькою мовами. Усі вони працюють у Німеччині і
          пропонують послуги як вдома, так і онлайн.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-gray-900">
          Догляд за літніми — турбота з повагою
        </h2>
        <p className="mt-3">
          <Link href={`/${lang}/search?category=seniorenbetreuung`} className="text-blue-600 hover:underline">
            Догляд за літніми
          </Link>{" "}
          включає значно більше, ніж медичні процедури. Це повсякденний супровід, емоційна
          підтримка та збереження якості життя. Наші спеціалісти допомагають із:
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>Щоденною гігієною та доглядом за тілом</li>
          <li>Супроводом до лікарів та установ</li>
          <li>Покупками та веденням домашнього господарства</li>
          <li>Спілкуванням та емоційною підтримкою</li>
          <li>Когнітивною активацією та підтримкою пам&apos;яті</li>
        </ul>
        <p className="mt-3">
          При деменції або хворобі Альцгеймера особливо важливо, щоб доглядальниця розмовляла
          рідною мовою пацієнта. Спогади, почуття та потреби найкраще виражаються тією мовою,
          яку людина знала з дитинства.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-gray-900">
          Медичний догляд вдома
        </h2>
        <p className="mt-3">
          <Link href={`/${lang}/search?category=krankenpflege`} className="text-blue-600 hover:underline">
            Догляд за хворими
          </Link>{" "}
          вдома стає дедалі популярнішим. Багато пацієнтів віддають перевагу перебуванню
          вдома, у звичній обстановці, замість переїзду до будинку для літніх.
        </p>
        <p className="mt-3">
          Кваліфіковані доглядальниці беруть на себе роздачу ліків, обробку ран, вимірювання
          тиску та координацію з лікарями. Чітка комунікація між пацієнтом і спеціалістом
          критично важлива — помилки при прийомі ліків або описі симптомів можуть мати
          серйозні наслідки.
        </p>
        <p className="mt-3">
          На Freuly ви знайдете спеціалістів, які не лише мають професійну кваліфікацію,
          а й розмовляють вашою мовою та розуміють вашу культуру.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-gray-900">
          Побутова допомога — невелика підтримка, великий результат
        </h2>
        <p className="mt-3">
          Не завжди потрібен повноцінний медичний догляд. Часто достатньо{" "}
          <Link href={`/${lang}/search?category=alltagshilfe`} className="text-blue-600 hover:underline">
            побутової допомоги
          </Link>
          , щоб значно полегшити повсякденне життя:
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>Допомога з приготуванням їжі</li>
          <li>Допомога з одяганням та гігієною</li>
          <li>Супровід на прогулянках</li>
          <li>Купівля продуктів та побутових товарів</li>
          <li>Легке прибирання та підтримання порядку</li>
        </ul>
        <p className="mt-3">
          Для літніх людей, які ще достатньо самостійні, але іноді потребують допомоги,
          побутовий супровід — ідеальне рішення. Він зберігає незалежність і дає впевненість,
          що поруч є надійна людина.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-gray-900">
          Чому Freuly для догляду та супроводу?
        </h2>
        <p className="mt-3">
          Freuly — платформа, створена спеціально для української та російськомовної спільноти
          в Німеччині. Ми розуміємо особливі потреби людей, які живуть у новій країні та
          шукають підтримку.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>Спеціалісти розмовляють українською, російською та німецькою</li>
          <li>Детальні профілі з інформацією про кваліфікацію та досвід</li>
          <li>Прозорі відгуки та рекомендації</li>
          <li>Простий зв&apos;язок зі спеціалістом через платформу</li>
          <li>Послуги вдома та онлайн</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-gray-900">
          Як обрати відповідного спеціаліста з догляду
        </h2>
        <p className="mt-3">При виборі доглядальниці або помічника зверніть увагу на:</p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li><strong>Мови:</strong> переконайтеся, що спеціаліст розмовляє мовою вашого родича</li>
          <li><strong>Досвід:</strong> запитайте рекомендації та інформацію про попередню роботу</li>
          <li><strong>Доступність:</strong> уточніть графік роботи та гнучкість заздалегідь</li>
          <li><strong>Кваліфікація:</strong> зверніть увагу на освіту та сертифікати</li>
          <li><strong>Особистий контакт:</strong> ознайомча зустріч допоможе зрозуміти, чи підходить вам людина</li>
        </ul>
        <p className="mt-3">
          На Freuly ви можете порівняти кілька профілів, прочитати відгуки та зв&apos;язатися зі
          спеціалістом напряму — все на одній платформі.
        </p>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Metadata                                                           */
/* ------------------------------------------------------------------ */

export async function generateMetadata({ params }: { params: { lang: string } }) {
  const lang = isSupportedLang(params.lang) ? (params.lang as Lang) : "de";
  const copy = COPY[lang];
  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
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

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function PflegeBetreuungPage({
  params,
}: {
  params: { lang: string };
}) {
  if (!isSupportedLang(params.lang)) {
    redirect("/de/pflege-betreuung");
  }

  const lang = params.lang as Lang;
  const copy = COPY[lang];

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
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        {copy.h1}
      </h1>

      <p className="mt-6 text-base leading-relaxed text-gray-700">{copy.intro}</p>

      {/* Subcategories */}
      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-gray-900">{copy.areasTitle}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SUBCATEGORIES.map((sub) => (
            <Link
              key={sub.slug}
              href={`/${lang}/search?category=${sub.slug}`}
              className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 transition-shadow hover:shadow-md"
            >
              {lbl(sub, lang)}
            </Link>
          ))}
        </div>
      </section>

      {/* Specialists */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-gray-900">{copy.specialistsTitle}</h2>
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
                    {s.city}{s.postal_code ? `, ${s.postal_code}` : ""}
                  </p>
                  {s.bio && <p className="mt-1 line-clamp-2 text-sm text-gray-600">{s.bio}</p>}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-gray-500 italic">{copy.specialistsEmpty}</p>
        )}
      </section>

      {/* SEO content */}
      <article className="mt-14 space-y-8 text-base leading-relaxed text-gray-700">
        {lang === "de" && <SeoContentDe lang={lang} />}
        {lang === "ru" && <SeoContentRu lang={lang} />}
        {lang === "ua" && <SeoContentUa lang={lang} />}
      </article>

      {/* CTA */}
      <section className="mt-12 rounded-2xl bg-teal-50 px-6 py-10 text-center">
        <h2 className="text-xl font-semibold text-gray-900">{copy.ctaHeading}</h2>
        <p className="mx-auto mt-2 max-w-md text-gray-600">{copy.ctaText}</p>
        <Link
          href={`/${lang}/search?category=pflege-betreuung`}
          className="mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-teal-600 px-8 text-base font-semibold text-white transition hover:bg-teal-700"
        >
          {copy.ctaButton}
        </Link>
      </section>

      {/* Cross-links */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-gray-900">{copy.otherTitle}</h2>
        <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {CROSS_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={`/${lang}/${link.href}`} className="text-blue-600 hover:underline">
                {lbl(link, lang)}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Footer links */}
      <section className="mt-10 border-t border-gray-200 pt-8">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {copy.seeAlso}
        </h3>
        <nav className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href={`/${lang}`} className="text-blue-600 hover:underline">{copy.home}</Link>
          <Link href="/specialists" className="text-blue-600 hover:underline">{copy.allSpecialists}</Link>
          <Link href="/for-specialists" className="text-blue-600 hover:underline">{copy.becomeSpecialist}</Link>
        </nav>
      </section>
    </main>
  );
}
