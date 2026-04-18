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
        ctaHref: "/de/category/seniorenbetreuung",
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
        ctaHref: "/ru/category/seniorenbetreuung",
      },
    },
    ua: {
      slug: "pflege-betreuung",
      parentSlug: null,
      locale: "ua",
      categoryType: "parent",
      metaTitle:
        "Догляд і супровід у Німеччині: формати та пошук допомоги | Freuly",
      metaDescription:
        "Допомога вдома: чим відрізняються побут, медсестринські задачі та сопровід; чому мова — безпека; перше повідомлення — без фінансових обіцянок від Freuly.",
      h1: "Догляд і супровід — спочатку навантаження, потім роль фахівця",
      breadcrumbsLabel: "Догляд і супровід",
      homeLabel: "Головна",
      intro: [
        "Сторінка для родин, які шукають підтримку вдома: літні батьки, післяопераційний період або перевантаження без можливості «робити все самим».",
        "Фокус на практичних годинах поруч, не на абстрактному «здоров’ї загалом».",
        "Нижче — зразки; деталі — у категоріях.",
      ],
      subcategoriesTitle: "Що обрати",
      subcategories: [
        {
          slug: "seniorenbetreuung",
          label: "Догляд за літніми",
          description: "Спілкування й базові побутові речі.",
        },
        {
          slug: "krankenpflege",
          label: "Медичний догляд",
          description: "Коли потрібні меднавички.",
        },
        {
          slug: "alltagshilfe",
          label: "Побутова допомога",
          description: "Без медманіпуляцій.",
        },
        {
          slug: "kinderbetreuung",
          label: "Діти",
          description: "Мова в профілі.",
        },
        {
          slug: "haushaltshilfe",
          label: "Домашня праця",
          description: "Якщо дім — головне вогнище хаосу.",
        },
        {
          slug: "begleitdienst",
          label: "Супровід",
          description: "Лікарні й установи при слабкій німецькій.",
        },
      ],
      sections: [
        {
          heading: "Комбінування",
          body: [
            "Часто потрібні дві ролі — опишіть окремо.",
            "Платформа не визначає Pflegegrad.",
          ],
        },
        {
          heading: "Мова",
          bullets: [
            "Дози й біль — зона ризику.",
            "Деменція — рідна мова як опора.",
          ],
        },
        {
          heading: "Держава",
          body: "Виплати — не через Freuly.",
        },
        {
          heading: "Офлайн-ядро",
          bullets: [
            "Догляд — переважно фізично.",
            "Відео як допомога у виборі — не заміна візиту.",
          ],
        },
        {
          heading: "Перший лист",
          body: "Хто, яка мова, які щоденні задачі, графік.",
        },
        {
          heading: "Freuly",
          body: "Вітрина профілів без гарантій лікування.",
        },
      ],
      specialistsTitle: "Фахівці (приклади)",
      specialistsEmpty:
        "Щойно в цій категорії з’являться відповідні фахівці на Freuly, вони будуть показані тут.",
      faqTitle: "Часті питання",
      faq: [
        {
          question: "Чи треба Pflegegrad?",
          answer:
            "Не для пошуку тут; для компенсацій — за правилами Німеччини.",
        },
        {
          question: "Побут чи меддогляд?",
          answer:
            "Різні компетенції.",
        },
        {
          question: "Деменція?",
          answer:
            "Рідна мова важлива для спокою.",
        },
        {
          question: "Погодинно?",
          answer:
            "Часто — див. профіль.",
        },
        {
          question: "Ціна?",
          answer:
            "Напряму з фахівцем.",
        },
      ],
      relatedTitle: "Суміжні розділи",
      relatedLinks: [
        {
          href: "health-psychology",
          label: "Психологія",
          description: "Родичам, які вигорають.",
        },
        {
          href: "cleaning",
          label: "Прибирання",
          description: "Якщо пріоритет — дім.",
        },
        {
          href: "housemaster",
          label: "Майстер",
          description: "Техніка додатково.",
        },
      ],
      cta: {
        heading: "Категорія догляду за літніми",
        body: "Почати фільтр, потім звузити за кваліфікацією.",
        buttonLabel: "Відкрити",
        ctaHref: "/ua/category/seniorenbetreuung",
      },
    },
  },
};
