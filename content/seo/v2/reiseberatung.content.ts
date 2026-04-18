import type { LocalizedSeoCategory } from "@/lib/seo/content";

/** SEO page: travel consulting / trip planning (standalone hub). */
export const reiseberatungContent: LocalizedSeoCategory = {
  slug: "reiseberatung",
  parentSlug: null,
  categoryType: "parent",
  filterOr:
    "category.ilike.%reiseberatung%,category.ilike.%travel%,category.ilike.%reise%",
  content: {
    de: {
      slug: "reiseberatung",
      parentSlug: null,
      locale: "de",
      categoryType: "parent",
      metaTitle:
        "Reiseberatung in Deutschland: Route, Budget, Dokumente — vor dem Buchen klären | Freuly",
      metaDescription:
        "Konkrete Reiseberatung statt Marketing-Floskeln: welche Infos Sie sammeln, was Sie in der Erstnachricht schreiben, Pauschal vs. individuell, und wie Sie Berater:innen finden, die auf Ukrainisch, Russisch oder Deutsch planen.",
      h1: "Reiseberatung — Plan bauen, bevor Sie Slots blockieren",
      breadcrumbsLabel: "Reiseberatung",
      homeLabel: "Startseite",
      intro: [
        "Diese Seite richtet sich an alle, die einen Trip in oder durch Deutschland strukturieren wollen: Hotels, Züge, Mietwagen, Tagesetappen oder Visa-Zeitfenster — und die eine Person suchen, mit der sie dieselbe Sprache sprechen, wenn es um Feinheiten geht.",
        "Im Unterschied zur großen Übersicht „Reisen & Tourismus“ geht es hier nicht um alle Urlaubsarten auf einmal, sondern um den Einstieg „Beratung & Organisation“: weniger Sightseeing-Fotos, mehr Kalendarium, Budget und Fragenlisten.",
        "Unten sehen Sie eine Auswahl sichtbarer Profile; die vollständige Filterung erfolgt in der Kategorie.",
      ],
      subcategoriesTitle: "Was Beratung oft abdeckt — ohne festes Versprechen",
      subcategories: [
        {
          slug: "pauschalreisen",
          label: "Pauschalreisen",
          description:
            "Wenn ein Paket mit festem Leistungskatalog passt — schneller buchbar, weniger Micro-Flex bei Storno und Routing.",
        },
        {
          slug: "individualreisen",
          label: "Individualreisen",
          description:
            "Wenn Tageslängen, Pausen und Haltestellen zu Ihrem Tempo passen müssen — Aufwand in der Abstimmung, dafür weniger Kompromisse.",
        },
        {
          slug: "visa-hilfe",
          label: "Visa-Hilfe",
          description:
            "Checklisten und Erfahrungswerte parallel zur Reiseroute — keine Rechtsberatung, aber saubere Vorbereitung der Unterlagen.",
        },
      ],
      sections: [
        {
          heading: "Wer hier landet — und was nicht Aufgabe der Beratung ist",
          body: [
            "Typischer Einstieg: „Wir fahren im September zwei Wochen, zwei Kinder, brauchen aber Ruhetage“ oder „Erster Deutschland-Aufenthalt, ich übersehe Bahn-Tarife gerne“. Die Person hilft beim Zusammenpuzzeln — ersetzt aber keine Versicherung und keine Visa-Verfügbarkeit von Botschaften.",
            "Bei akuten medizinischen Notfällen oder rechtlichen Streitfällen wenden Sie sich an Profis vor Ort — nicht an eine Reiseberater:in als Ersatz.",
          ],
        },
        {
          heading: "Erstnachricht: was Profis wirklich brauchen",
          bullets: [
            "Zeitraum als Spanne plus Reiseflex in Tagen.",
            "Reisende inkl. Alter und grobe Mobilität (Kinderwagen, Treppen in Altstädten).",
            "Budget als ehrliche Bandbreite — sonst entstehen Vorschläge, die psychologisch unbequem sind.",
            "Ob Sie Bahn, Auto oder Mix wollen und wie viele Hotelwechsel Sie emotional verkraften.",
            "Sprache der Betreuung — damit auf Freuly das Profil passt.",
          ],
        },
        {
          heading: "Pauschal oder maßgeschneidert — Entscheidungshilfe",
          bullets: [
            "Pauschal: weniger Koordinationsstress, klare Preisliste, Storno je nach Anbieter lesen.",
            "Individuell: mehr E-Mails und Zeit, aber Routen, die zu Ihrem Rhythmus passen — etwa längere Aufenthalte pro Ort.",
          ],
        },
        {
          heading: "Online planen, Reise vor Ort erleben",
          body: "Die meisten Abstimmungen laufen schriftlich oder per Video; Tickets und Keys bekommen Sie digital. Freuly ändert nichts an Zahlungsflüssen — Sie bleiben mit der gewählten Person im Austausch, wir stellen nur den Kontext der Profile.",
        },
        {
          heading: "So starten Sie auf Freuly",
          body: "Vergleichen Sie zwei bis drei Steckbriefe, schreiben Sie mit denselben Eckdaten — dann lässt sich einschätzen, wer antwortet, nachfragt und realistische Optionen nennt statt Sofort-Clickbait.",
        },
      ],
      specialistsTitle: "Reiseberaterinnen und -berater (Auswahl)",
      specialistsEmpty:
        "Sobald sichtbare Profile zu dieser Thematik existieren, erscheinen sie hier.",
      faqTitle: "Häufige Fragen",
      faq: [
        {
          question: "Bucht die Berater:in alle Teilstrecken für mich?",
          answer:
            "Das ist individuell. Manche begnügen sich mit Plan und Links, andere begleiten den Buchungsprozess — klären Sie das vor Zahlungspflichtigen Schritten.",
        },
        {
          question: "Ersetzt Freuly eine Reiserücktrittsversicherung?",
          answer:
            "Nein. Policen und deren Bedingungen sind separat zu prüfen; die Plattform zeigt Profile, signiert keine Versicherungen.",
        },
        {
          question: "Wie unterscheidet sich das von „Reisen & Tourismus“?",
          answer:
            "Die große Seite ordnet das gesamte Themenfeld mit Touren und Retreats; hier liegt der Fokus bewusst auf Beratung und Logistik vor dem Buchen.",
        },
        {
          question: "Wann eher Touren & Ausflüge statt Reiseberatung?",
          answer:
            "Wenn der Trip schon steht und Sie nur einen Tag mit Guide füllen wollen — dann ist die Touren-Seite der passendere Einstieg.",
        },
        {
          question: "Gibt es kostenlose Erstgespräche?",
          answer:
            "Fragen Sie direkt; manche Profile listen Kurztermine oder geschützte Erstinformationssätze.",
        },
      ],
      relatedTitle: "Verwandte Einstiege",
      relatedLinks: [
        {
          href: "reisen-tourismus",
          label: "Reisen & Tourismus — Themenkarte",
          description:
            "Breiter Überblick, bevor Sie sich auf Beratung verengen — oder wenn Retreat und Alltag parallel eine Rolle spielen.",
        },
        {
          href: "touren-ausfluege",
          label: "Touren & Ausflüge",
          description:
            "Wenn nur noch geführte Tage oder Halbtage fehlen, nicht die ganze Route.",
        },
        {
          href: "retreats",
          label: "Retreats",
          description:
            "Mehrtägige Fokus-Formate — anderes Produkt als klassische Beratung, manchmal aber kombiniert.",
        },
      ],
      cta: {
        heading: "Reiseberatung in der Kategorie öffnen",
        body: "Filtern Sie nach Sprache und schreiben Sie mit Datumsspanne plus Budget.",
        buttonLabel: "Kategorie Reiseberatung",
        ctaHref: "/de/category/reiseberatung",
      },
    },
    ru: {
      slug: "reiseberatung",
      parentSlug: null,
      locale: "ru",
      categoryType: "parent",
      metaTitle:
        "Консультации по поездкам в Германии: маршрут, бюджет, логистика | Freuly",
      metaDescription:
        "Не общие «советы путешественнику», а практика: что собрать до письма консультанту, как описать поездку, пакет или индивидуальный маршрут, и как найти специалиста на русском, украинском или немецком.",
      h1: "Консультации по путешествиям — сначала план, потом бронирование",
      breadcrumbsLabel: "Подбор туров",
      homeLabel: "Главная",
      intro: [
        "Страница для тех, кому нужно собрать поездку по Германии или через неё: жильё, пересадки, машина или поезда, детали по датам — и поговорить с человеком на привычном языке, когда мелочи легко перепутать.",
        "Это уже не широкий лендинг «туризм вообще», как в разделе «Туризм и путешествия»: здесь упор на «помочь спланировать и не забить календарь слепо».",
        "Ниже — примеры профилей; полный поиск — в категории.",
      ],
      subcategoriesTitle: "О чём обычно договариваются",
      subcategories: [
        {
          slug: "pauschalreisen",
          label: "Пакетные предложения",
          description:
            "Когда важен ясный состав услуг и меньше самостоятельных бронирований — читайте правила отмены.",
        },
        {
          slug: "individualreisen",
          label: "Индивидуальные маршруты",
          description:
            "Когда важны темп, остановки и гибкий график — больше переписки, меньше компромиссов с чужим ритмом.",
        },
        {
          slug: "visa-hilfe",
          label: "Визы и документы",
          description:
            "Параллельно маршруту — без юридических гарантий, но с чеклистами.",
        },
      ],
      sections: [
        {
          heading: "Кого это решает и чего не ждать",
          body: [
            "Консультант помогает структурировать поездку; он не страховой агент и не гарантирует визу или погоду.",
            "Если нужен только гид на один день при уже купленных билетах — логичнее начать с «Экскурсии и туры».",
          ],
        },
        {
          heading: "Что написать в первом сообщении",
          bullets: [
            "Даты или окно ± несколько дней.",
            "Состав семьи и ограничения по здоровью, влияющие на ходьбу и лифты.",
            "Ориентир бюджета без стеснения.",
            "Поезда, авто или смешанный формат.",
            "Язык сопровождения.",
          ],
        },
        {
          heading: "Пакет или свой план",
          bullets: [
            "Пакет — меньше задач вам, иногда жёстче условия отмены.",
            "Свой маршрут — дольше согласования, точнее попадание в ваш стиль.",
          ],
        },
        {
          heading: "Онлайн и поездка на месте",
          body: "План обычно рождается в переписке и звонках; оплата и билеты — по правилам выбранного специалиста. Freuly не касса.",
        },
        {
          heading: "Первый шаг на Freuly",
          body: "Сравните пару профилей и отправьте одинаковое короткое брифинг-описание — так проще увидеть, кто отвечает по делу.",
        },
      ],
      specialistsTitle: "Консультанты (примеры)",
      specialistsEmpty:
        "Подходящие видимые профили появятся по мере наполнения базы.",
      faqTitle: "Вопросы",
      faq: [
        {
          question: "Бронирует ли консультант всё сам?",
          answer:
            "По-разному. Уточняйте, где заканчивается совет и начинается бронирование от их имени.",
        },
        {
          question: "Чем это отличается от обзора «Туризм и путешествия»?",
          answer:
            "Там карта всех тем; здесь — узкий фокус на консультации и логистике.",
        },
        {
          question: "Страховка через Freuly?",
          answer:
            "Нет. Оформляйте отдельно.",
        },
        {
          question: "Когда идти в экскурсии, а не сюда?",
          answer:
            "Когда маршрут уже куплен и нужен только гид на день.",
        },
        {
          question: "Бесплатный первый контакт бывает?",
          answer:
            "Спросите в профиле — правила разные.",
        },
      ],
      relatedTitle: "Рядом на Freuly",
      relatedLinks: [
        {
          href: "reisen-tourismus",
          label: "Туризм и путешествия — карта тем",
          description: "Более широкий вход, если вы ещё выбираете тип отдыха.",
        },
        {
          href: "touren-ausfluege",
          label: "Экскурсии и туры",
          description: "Очные дни с гидом при готовом плане поездки.",
        },
        {
          href: "retreats",
          label: "Ретриты",
          description: "Много дней одного фокуса — другой продукт.",
        },
      ],
      cta: {
        heading: "Открыть категорию консультантов",
        body: "Фильтр по языку и конкретные даты в заявке.",
        buttonLabel: "Категория",
        ctaHref: "/ru/category/reiseberatung",
      },
    },
    ua: {
      slug: "reiseberatung",
      parentSlug: null,
      locale: "ua",
      categoryType: "parent",
      metaTitle:
        "Консультації з подорожей у Німеччині: маршрут, бюджет, логістика | Freuly",
      metaDescription:
        "Практичний вхід: що зібрати до першого листа консультанту, індивідуальний чи пакетний формат, мови супроводу — без обіцянок страховки чи візу від Freuly.",
      h1: "Консультації з подорожей — спершу структура, потім бронювання",
      breadcrumbsLabel: "Підбір турів",
      homeLabel: "Головна",
      intro: [
        "Сторінка для людей, які хочуть скласти поїздку Німеччиною чи регіоном: готелі, пересадки, авто чи залізниця — і обговорити дрібниці рідною мовою, аби не губитися в тарифах.",
        "Це вужче, ніж «Туризм і подорожі»: там мапа усіх форматів; тут — саме підбір і координація до оплати.",
        "Нижче — зразки профілів; повний перелік — у категорії.",
      ],
      subcategoriesTitle: "Типові блоки в роботі",
      subcategories: [
        {
          slug: "pauschalreisen",
          label: "Пакетні тури",
          description:
            "Коли важливі зрозумілі пакети — перевіряйте правила скасування.",
        },
        {
          slug: "individualreisen",
          label: "Індивідуальні поїздки",
          description:
            "Коли ритм і зупинки не повинні копіювати чужий графік.",
        },
        {
          slug: "visa-hilfe",
          label: "Візи та папери",
          description:
            "Поруч із маршрутом; юридичну оцінку дає не платформа.",
        },
      ],
      sections: [
        {
          heading: "Для кого ця сторінка",
          body: [
            "Для тих, хто вже шукає консультанта, а не лише натхнення. Якщо потрібен гід на один день — зручніше «Екскурсії та тури».",
            "Freuly не страхує й не гарантує одержання візи.",
          ],
        },
        {
          heading: "Що додати в перший лист",
          bullets: [
            "Дати або гнучке вікно.",
            "Склад родини, діти, зручність пересувань.",
            "Діапазон бюджету.",
            "Поїзд чи авто.",
            "Мова спілкування.",
          ],
        },
        {
          heading: "Пакет чи свій маршрут",
          bullets: [
            "Пакет — менше дрібних кроків для вас.",
            "Свій маршрут — довше домовлятися, але точніше в контекст.",
          ],
        },
        {
          heading: "Дистанційна підготовка",
          body: "План часто формується онлайн; оплата за правилами фахівця, не через «касу» Freuly.",
        },
        {
          heading: "Як почати",
          body: "Візьміть два-три профілі, надішліть однаковий короткий бриф — легше порівняти відповіді.",
        },
      ],
      specialistsTitle: "Приклади консультантів",
      specialistsEmpty:
        "Відповідні видимі анкети з’являться згодом.",
      faqTitle: "Питання",
      faq: [
        {
          question: "Чи бронює все консультант?",
          answer:
            "Залежить від людини — домовляйтеся явно.",
        },
        {
          question: "Чим це відрізняється від «Туризм і подорожі»?",
          answer:
            "Там — широка карта; тут — консультація як продукт.",
        },
        {
          question: "Страховка?",
          answer:
            "Окремо від платформи.",
        },
        {
          question: "Коли краще гіди?",
          answer:
            "Коли поїздка вже є, потрібен день із проводженням.",
        },
        {
          question: "Чи є безкоштовний перший контакт?",
          answer:
            "Питайте в профілі.",
        },
      ],
      relatedTitle: "Пов’язане",
      relatedLinks: [
        {
          href: "reisen-tourismus",
          label: "Туризм і подорожі",
          description: "Огляд усіх входів, якщо формат ще не обраний.",
        },
        {
          href: "touren-ausfluege",
          label: "Екскурсії та тури",
          description: "Очні дні після готового плану.",
        },
        {
          href: "retreats",
          label: "Ретрити",
          description: "Багатоденний фокус, не класичний тур.",
        },
      ],
      cta: {
        heading: "До категорії консультацій",
        body: "Мова + дати + бюджет у першому листі.",
        buttonLabel: "Відкрити категорію",
        ctaHref: "/ua/category/reiseberatung",
      },
    },
  },
};
