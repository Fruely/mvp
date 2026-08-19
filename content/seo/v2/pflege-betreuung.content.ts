import type { LocalizedSeoCategory } from "@/lib/seo/content";

/**
 * Parent category page for the Freuly SEO layer: "pflege-betreuung" hub.
 */
export const pflegeBetreuungContent: LocalizedSeoCategory = {
  slug: "pflege-betreuung",
  parentSlug: null,
  categoryType: "parent",
  filterOr:
    "category.ilike.%pflege%,category.ilike.%betreuung%,category.ilike.%care%",
  content: {
    de: {
      slug: "pflege-betreuung",
      parentSlug: null,
      locale: "de",
      categoryType: "parent",
      metaTitle:
        "Pflege & Betreuung in Deutschland: Formate verstehen, Hilfe finden | Freuly",
      metaDescription:
        "Seniorenbetreuung, Krankenpflege zu Hause, Alltagshilfe, Kinderbetreuung und Begleitdienste: wie Sie Bedarf von Qualifikation trennen, warum Sprache in der Pflege kritisch ist, und wie Sie auf Freuly konkrete Personen vergleichen — ohne Kassen- oder Rechtsversprechen der Plattform.",
      h1: "Pflege & Betreuung — zuerst Aufgaben klären, dann Menschen wählen",
      breadcrumbsLabel: "Pflege & Betreuung",
      homeLabel: "Startseite",
      intro: [
        "Diese Seite richtet sich an Familien und Einzelpersonen, die Unterstützung im Alltag oder bei Gesundheitsthemen zu Hause suchen — nicht an alle Lebenslagen gleichzeitig, aber mit dem Bedarf, Formate auseinanderzuhalten, bevor Verträge oder Stundenläufe beginnen.",
        "Im Unterschied zu allgemeinen Gesundheits- oder Reisethemen auf Freuly geht es hier um konkrete physische Präsenz: einkaufen, begleiten, Grundleistungen der Pflege oder fachlich geregelte Tätigkeiten — je nach Profil.",
        "Unten sehen Sie eine Auswahl sichtbarer Profile; die Feinfilterung erfolgt in den Pflegekategorien.",
      ],
      subcategoriesTitle: "Welches Unterformat passt zu welchem Bedarf?",
      subcategories: [
        {
          slug: "seniorenbetreuung",
          label: "Seniorenbetreuung",
          description:
            "Wenn Gesellschaft, Orientierung im Tag und einfache Hilfen im Haushalt im Vordergrund stehen — oft ohne klinische Pflegehandlungen.",
        },
        {
          slug: "krankenpflege",
          label: "Krankenpflege",
          description:
            "Wenn Dosierungen, Wunden, Abstimmung mit Ärztinnen nötig sind — nur mit entsprechender Qualifikation.",
        },
        {
          slug: "alltagshilfe",
          label: "Alltagshilfe",
          description:
            "Wenn Einkaufen, leichte Hausarbeit und Begleitung reichen — bewusst nicht-medizinisch.",
        },
        {
          slug: "kinderbetreuung",
          label: "Kinderbetreuung",
          description:
            "Wenn verlässliche Erwachsene auf Deutsch, Ukrainisch oder Russisch gesucht werden — klar im Profil abfragen.",
        },
        {
          slug: "haushaltshilfe",
          label: "Haushaltshilfe",
          description:
            "Wenn Hygiene im Raum Thema ist, nicht primär Menschen am Bett.",
        },
        {
          slug: "begleitdienst",
          label: "Begleitdienst",
          description:
            "Wenn Arzt- oder Behördentermine mit Sprachunterstützung gescheitert wären — ohne dass die Person klinisch eingreifen muss.",
        },
      ],
      sections: [
        {
          heading: "Formate kombinieren stärker als ein Monolith",
          body: [
            "Realitätsnah: eine Fachkraft für medizinische Handgriffe, eine andere für Einkauf und Gespräch — plus Familienressourcen. Die Seite hilft, nicht alles einer Rolle zu überladen.",
            "Wenn unsicher: kurz beschreiben, was täglich schiefgeht (Medikamente? Mobilität? Isolation?), dann zeigen Profile klarer, ob sie zuständig sind.",
          ],
        },
        {
          heading: "Warum Sprache nicht „Komfort“, sondern Risiko reduziert",
          bullets: [
            "Dosierungsdialoge, Schmerzbeschreibungen und Demenz brauchen vertraute Wörter.",
            "Missverständnisse entstehen bei Zeitdruck oft bei Zahlen und Einheiten.",
            "Vertrauen gegenüber einer fremden Person wächst, wenn Alltagskultur nicht erklärt werden muss.",
          ],
        },
        {
          heading: "Leistungsrecht und Freuly",
          body: "Pflegegrad, Pflegekasse und Entlastungsbudget sind deutsche Regelwerke — Freuly ersetzt keine Sachbearbeitung und garantiert keine Bewilligung. Die Plattform vermittelt Menschen, deren Sprache und Kompetenzen Sie im Steckbrief prüfen.",
        },
        {
          heading: "Vor-Ort first — digital nur ergänzend",
          bullets: [
            "Hausbesuche und Begleitung passieren physisch.",
            "Video kann Erstkontakt oder Abstimmung mit entfernten Angehörigen erleichtern — ersetzt aber keine Hilfe vor Ort.",
          ],
        },
        {
          heading: "Erste Nachricht an eine Pflegeperson",
          body: "Alter der betroffenen Person, Sprachbedarf, welche Tätigkeiten explizit nötig sind, welche Wochentage realistisch sind — kurz, aber konkret. So lässt sich Fit eher beurteilen als mit „Wir brauchen Hilfe“ allein.",
        },
        {
          heading: "So navigieren Sie auf Freuly",
          body: "Kacheln oben zeigen Richtungen; Profilvergleich mit identischem Briefing an zwei bis drei Personen spart Missverständnisse. Kein Ergebnis ist medizinisch zugesichert — Entscheidungen treffen Sie weiterhin mit ärztlicher Begleitung, wo nötig.",
        },
      ],
      specialistsTitle: "Pflege- und Betreuungspersonen (Auswahl)",
      specialistsEmpty:
        "Sobald passende Pflege- und Betreuungspersonen auf Freuly registriert sind, erscheinen sie hier.",
      faqTitle: "Häufige Fragen",
      faq: [
        {
          question: "Brauche ich einen Pflegegrad für Freuly?",
          answer:
            "Nein für die Suche — ja, wenn Sie Leistungen über die Pflegekasse laufen lassen wollen; das klären Sie außerhalb der Plattform mit Kasse und Beratung.",
        },
        {
          question: "Was ist der Unterschied zwischen Alltagshilfe und Krankenpflege?",
          answer:
            "Alltagshilfe bleibt bei nicht-medizinischen Aufgaben; Krankenpflege setzt eine entsprechende Ausbildung und ggf. delegierte ärztliche Aufgaben voraus.",
        },
        {
          question: "Demenz: warum Muttersprache wichtiger als Akzentfreiheit?",
          answer:
            "Vertraute Wörter beruhigen und helfen, Anweisungen zu verstehen — das ist mehr als „nett auf Deutsch sprechen“.",
        },
        {
          question: "Stundenweise möglich?",
          answer:
            "Viele Profile bieten genau das — Lesen Sie Kapazität und Vertretung im Steckbrief.",
        },
        {
          question: "Preise?",
          answer:
            "Regional und nach Qualifikation unterschiedlich — direkt mit dem Anbieter klären; Freuly ist nicht Arbeitgeber.",
        },
      ],
      relatedTitle: "Verwandte Bereiche",
      relatedLinks: [
        {
          href: "health-psychology",
          label: "Psychologie & Gesundheit",
          description:
            "Wenn pflegende Angehörige selbst entlastet werden müssen — kein Ersatz für Pflegekraft.",
        },
        {
          href: "cleaning",
          label: "Reinigung",
          description:
            "Wenn primär Staub und Wäsche drängen, nicht Menschenpflege.",
        },
        {
          href: "housemaster",
          label: "Hausmeister & Handwerk",
          description:
            "Technische Hilfen neben Betreuung — andere Kompetenz.",
        },
      ],
      cta: {
        heading: "Pflegeprofile in der Kategorie öffnen",
        body: "Start mit Seniorenbetreuung, dann nach Qualifikation verfeinern.",
        buttonLabel: "Kategorie Seniorenbetreuung",
        ctaHref: "/de/specialists/seniorenbetreuung",
      },
    },
    ru: {
      slug: "pflege-betreuung",
      parentSlug: null,
      locale: "ru",
      categoryType: "parent",
      metaTitle:
        "Уход и сопровождение в Германии: форматы и поиск помощи | Freuly",
      metaDescription:
        "Поиск специалистов по уходу на дому: чем отличаются быт, сестринские задачи и сопровождение; почему язык — это безопасность; как писать первое сообщение — без обещаний страховки от Freuly.",
      h1: "Уход и сопровождение — сначала задачи, потом роль",
      breadcrumbsLabel: "Уход и сопровождение",
      homeLabel: "Главная",
      intro: [
        "Страница для тех, кому нужна регулярная поддержка дома: пожилой человек, послеоперационный период или перегруженная семья — с разделением «что отдать специалисту» и «что оставить себе».",
        "Это не универсальный текст «о здоровье» и не туризм: упор на практические часы рядом с человеком.",
        "Ниже — примеры профилей; фильтры — в категориях.",
      ],
      subcategoriesTitle: "Что выбрать по ситуации",
      subcategories: [
        {
          slug: "seniorenbetreuung",
          label: "Уход за пожилыми",
          description:
            "Общение, быт, прогулки — без сложных процедур.",
        },
        {
          slug: "krankenpflege",
          label: "Медицинский уход",
          description:
            "Когда нужны компетенции сестры и связь с врачом.",
        },
        {
          slug: "alltagshilfe",
          label: "Помощь в быту",
          description:
            "Магазины, лёгкая уборка — без медзадач.",
        },
        {
          slug: "kinderbetreuung",
          label: "Присмотр за детьми",
          description:
            "Язык и график — в профиле.",
        },
        {
          slug: "haushaltshilfe",
          label: "Домашняя помощь",
          description:
            "Если грязь в квартире давит сильнее ухода за человеком.",
        },
        {
          slug: "begleitdienst",
          label: "Сопровождение",
          description:
            "Визиты к врачу и в инстанции при слабом немецком.",
        },
      ],
      sections: [
        {
          heading: "Комбинировать роли",
          body: [
            "Часто нужна связка «медсестра X часов + помощник по магазину» — это нормально описать прямо.",
            "Freuly не ставит диагнозы и не подтверждает льготы Pflegekasse.",
          ],
        },
        {
          heading: "Язык и безопасность",
          bullets: [
            "Лекарства и боль — темы, где ошибки дороже, чем «удобный разговор».",
            "Деменция сильнее реагирует на привычные слова.",
          ],
        },
        {
          heading: "Госструктуры",
          body: "Pflegegrad и выплаты — вне платформы; здесь поиск людей.",
        },
        {
          heading: "Очно и онлайн",
          bullets: [
            "Основной объём — дома или в дороге к врачу.",
            "Звонок может помочь в подборе, не заменяя визит.",
          ],
        },
        {
          heading: "Первое сообщение",
          body: "Кто получает помощь, язык, какие задачи ежедневно, график — минимум для ответа «берусь/нет».",
        },
        {
          heading: "Freuly",
          body: "Сопоставляет профили; не гарантирует исход лечения.",
        },
      ],
      specialistsTitle: "Специалисты (примеры)",
      specialistsEmpty:
        "Когда в этой категории появятся подходящие специалисты на Freuly, они отобразятся здесь.",
      faqTitle: "Частые вопросы",
      faq: [
        {
          question: "Нужен ли Pflegegrad?",
          answer:
            "Не для поиска на Freuly; для компенсаций через кассу — по правилам DE.",
        },
        {
          question: "Быт против медухода?",
          answer:
            "Разные компетенции — не смешивайте задачи без проверки профиля.",
        },
        {
          question: "Деменция и язык?",
          answer:
            "Родной язык снижает тревогу и ошибки.",
        },
        {
          question: "Почасово?",
          answer:
            "Часто да — смотрите профиль.",
        },
        {
          question: "Цена?",
          answer:
            "Напрямую со специалистом.",
        },
      ],
      relatedTitle: "Смежные разделы",
      relatedLinks: [
        {
          href: "health-psychology",
          label: "Психология",
          description: "Для выгорания уходящих.",
        },
        {
          href: "cleaning",
          label: "Уборка",
          description: "Если грязь — главная боль.",
        },
        {
          href: "housemaster",
          label: "Мастер на дом",
          description: "Техника рядом с уходом.",
        },
      ],
      cta: {
        heading: "Категория ухода за пожилыми",
        body: "Старт фильтра — дальше уточнение по квалификации.",
        buttonLabel: "Открыть",
        ctaHref: "/ru/specialists/seniorenbetreuung",
      },
    },
    ua: {
      slug: "pflege-betreuung",
      parentSlug: null,
      locale: "ua",
      categoryType: "parent",
      metaTitle:
        "Догляд і супровід у Німеччині: як знайти допомогу вдома | Freuly",
      metaDescription:
        "Пошук помічників для літніх батьків, після операції чи у побуті — зрозумілою мовою. Як обрати між побутовою допомогою та медичним доглядом, на що звернути увагу і як написати перше повідомлення.",
      h1: "Догляд і супровід — як знайти потрібну людину для допомоги вдома",
      breadcrumbsLabel: "Догляд і супровід",
      homeLabel: "Головна",
      intro: [
        "Ця сторінка — для тих, хто шукає підтримку в повсякденному житті: допомога літнім батькам, супровід після операції, догляд за дитиною або просто розвантаження, коли родина більше не справляється сама.",
        "На Freuly зібрані профілі людей, які пропонують різні формати допомоги — від побутових справ до медичного догляду. Нижче ви побачите, чим відрізняються ці формати, і зможете перейти до потрібної категорії.",
        "Freuly допомагає знайти фахівця, але не є медичною службою, не визначає ступінь догляду (Pflegegrad) і не гарантує жодних виплат від страхової каси.",
      ],
      subcategoriesTitle: "Яка допомога вам підходить",
      subcategories: [
        {
          slug: "seniorenbetreuung",
          label: "Догляд за літніми",
          description:
            "Спілкування, щоденна підтримка та прості побутові справи — без складних медичних процедур.",
        },
        {
          slug: "krankenpflege",
          label: "Медичний догляд",
          description:
            "Коли потрібні медичні навички: контроль ліків, перев’язки, координація з лікарем.",
        },
        {
          slug: "alltagshilfe",
          label: "Побутова допомога",
          description:
            "Покупки, легке прибирання, супровід у справах — без медичних завдань.",
        },
        {
          slug: "kinderbetreuung",
          label: "Догляд за дітьми",
          description:
            "Надійна людина для дитини, яка говорить українською, російською або німецькою.",
        },
        {
          slug: "haushaltshilfe",
          label: "Домашня допомога",
          description:
            "Коли основна проблема — стан житла, а не догляд за людиною.",
        },
        {
          slug: "begleitdienst",
          label: "Супровід",
          description:
            "Допомога з візитами до лікаря чи в установи, коли складно спілкуватися німецькою.",
        },
      ],
      sections: [
        {
          heading: "Яку допомогу можна шукати",
          body: [
            "Часто одна людина не може закрити всі потреби. Наприклад, для медичних процедур потрібен фахівець з відповідною кваліфікацією, а для покупок і прогулянок — помічник у побуті. Це нормально — поєднувати кілька ролей.",
            "Якщо ви не впевнені, що саме потрібно, спробуйте описати, що щодня створює найбільше труднощів: прийом ліків, пересування, самотність. Це допоможе зрозуміти, який формат підходить.",
          ],
        },
        {
          heading: "Коли важлива мова",
          bullets: [
            "Розмови про ліки, дозування та біль потребують точних слів — помилки тут коштують дорого.",
            "Людям з деменцією рідна мова дає відчуття безпеки та знижує тривогу.",
            "Довіра до незнайомої людини зростає, коли не треба пояснювати побутові звички й культурний контекст.",
          ],
        },
        {
          heading: "Що Freuly не робить",
          body: "Pflegegrad, виплати від Pflegekasse та юридичні питання — це окрема процедура за правилами Німеччини. Freuly не замінює консультацію в касі чи соціальній службі. Платформа допомагає знайти людей, чию мову та досвід можна перевірити в профілі.",
        },
        {
          heading: "Онлайн-домовленість і допомога на місці",
          bullets: [
            "Догляд і супровід — це передусім фізична присутність: вдома, на прогулянці, у лікарні.",
            "Відеодзвінок може допомогти на етапі знайомства або для координації з родичами на відстані, але не замінює візит.",
          ],
        },
        {
          heading: "Що написати у першому повідомленні",
          body: "Вкажіть, кому потрібна допомога, якою мовою зручно спілкуватися, які конкретні завдання виникають щодня і який графік вам підходить. Цього достатньо, щоб фахівець зрозумів, чи може він допомогти.",
        },
        {
          heading: "Як користуватися цією сторінкою",
          body: "Оберіть потрібну категорію вище, перегляньте профілі та напишіть двом-трьом людям однаковий запит — так простіше порівняти. Жоден результат на Freuly не є медичною гарантією: рішення ви приймаєте самостійно, за потреби — з лікарем.",
        },
      ],
      specialistsTitle: "Фахівці з догляду та супроводу",
      specialistsEmpty:
        "Щойно в цій категорії з’являться відповідні фахівці на Freuly, вони будуть показані тут.",
      faqTitle: "Часті питання",
      faq: [
        {
          question: "Чи потрібен Pflegegrad, щоб шукати на Freuly?",
          answer:
            "Ні, для пошуку на платформі Pflegegrad не потрібен. Він знадобиться, якщо ви хочете отримати компенсацію від Pflegekasse — це вирішується окремо, за правилами Німеччини.",
        },
        {
          question: "Чим відрізняється побутова допомога від медичного догляду?",
          answer:
            "Побутова допомога — це покупки, прибирання, супровід. Медичний догляд передбачає спеціальну підготовку: контроль ліків, перев’язки, координацію з лікарем. Перед вибором перевірте, що саме зазначено в профілі.",
        },
        {
          question: "Чому при деменції важлива рідна мова?",
          answer:
            "Звичні слова заспокоюють і допомагають людині розуміти прості вказівки. Це не просто зручність — це питання безпеки та емоційного комфорту.",
        },
        {
          question: "Чи можна домовитися на кілька годин на тиждень?",
          answer:
            "Так, багато фахівців працюють погодинно. Умови та доступність вказані в їхньому профілі.",
        },
        {
          question: "Скільки це коштує?",
          answer:
            "Ціна залежить від кваліфікації, обсягу роботи та регіону. Домовляйтеся безпосередньо з фахівцем — Freuly не є роботодавцем і не встановлює тарифи.",
        },
      ],
      relatedTitle: "Суміжні розділи",
      relatedLinks: [
        {
          href: "health-psychology",
          label: "Психологія і здоров’я",
          description:
            "Підтримка для тих, хто доглядає за близькими і сам потребує допомоги з вигоранням.",
        },
        {
          href: "cleaning",
          label: "Прибирання",
          description:
            "Коли головна потреба — чистота в домі, а не догляд за людиною.",
        },
        {
          href: "housemaster",
          label: "Майстер і ремонт",
          description:
            "Технічні завдання по дому, які часто виникають паралельно з доглядом.",
        },
      ],
      cta: {
        heading: "Перейти до категорії догляду за літніми",
        body: "Почніть з профілів у категорії «Догляд за літніми» і звужуйте пошук за мовою та кваліфікацією.",
        buttonLabel: "Відкрити категорію",
        ctaHref: "/ua/specialists/seniorenbetreuung",
      },
    },
  },
};
