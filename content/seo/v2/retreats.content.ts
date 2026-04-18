import type { LocalizedSeoCategory } from "@/lib/seo/content";

/**
 * Parent category page for the Freuly SEO layer: "retreats" hub.
 *
 * Role: umbrella page that explains which retreat formats are common in
 * Germany (yoga, meditation, wellness & spa, creative, nature, detox) and
 * helps the visitor narrow down to a concrete direction before searching
 * for a specialist / organizer.
 *
 * Routed at: `/{lang}/retreats` (see `app/[lang]/retreats/page.tsx`).
 */
export const retreatsContent: LocalizedSeoCategory = {
  slug: "retreats",
  parentSlug: null,
  categoryType: "parent",
  filterOr:
    "category.ilike.%retreat%,category.ilike.%yoga%,category.ilike.%wellness%,category.ilike.%meditation%",
  content: {
    de: {
      slug: "retreats",
      parentSlug: null,
      locale: "de",
      categoryType: "parent",
      metaTitle: "Retreats in Deutschland – Yoga, Meditation, Wellness & mehr | Freuly",
      metaDescription:
        "Überblick über Retreat-Formate in Deutschland: Yoga, Meditation, Wellness & Spa, kreative und Natur-Retreats. Finden Sie Anbieter, die Ukrainisch, Russisch oder Deutsch sprechen.",
      h1: "Retreats in Deutschland – welches Format passt zu Ihnen?",
      breadcrumbsLabel: "Retreats",
      homeLabel: "Startseite",
      intro: [
        "Ein Retreat ist eine bewusst begrenzte Auszeit, in der Sie sich auf eine Sache konzentrieren: Körper, Atem, Kopf, Kreativität oder schlicht Stille. In Deutschland ist das Angebot groß, aber sehr unterschiedlich im Charakter.",
        "Diese Übersicht hilft, das passende Retreat-Format zu finden – und dann gezielt Anbieterinnen und Anbieter auf Freuly zu kontaktieren, die Ukrainisch, Russisch oder Deutsch sprechen.",
      ],
      subcategoriesTitle: "Welche Retreat-Formate gibt es?",
      subcategories: [
        {
          slug: "yoga-retreats",
          label: "Yoga-Retreats",
          description:
            "Mehrere Tage mit festem Yoga-Rhythmus, Atemarbeit und einfacher Kost. Geeignet für Einsteiger und für alle, die ihre Praxis vertiefen wollen.",
        },
        {
          slug: "meditation",
          label: "Meditations-Retreats",
          description:
            "Ruhiges Setting, oft mit Sitzmeditation, Gehmeditation und Schweigeblöcken. Hilfreich bei Überreizung und zum Sortieren von Gedanken.",
        },
        {
          slug: "wellness-spa",
          label: "Wellness & Spa",
          description:
            "Wochenend- oder Kurformate mit Sauna, Massagen, Thermalbädern und begleitenden Kursen. Fokus auf körperliche Erholung.",
        },
        {
          slug: "kreativ-retreats",
          label: "Kreativ-Retreats",
          description:
            "Schreiben, Malen, Musik oder Fotografie in kleinen Gruppen. Gut, wenn Sie eine künstlerische Praxis bewusst wieder aufnehmen möchten.",
        },
      ],
      sections: [
        {
          heading: "Was ist auf einem Retreat anders als im Urlaub?",
          body: [
            "Ein Retreat ist kein Wellnesstrip mit offenem Programm: Es gibt eine klare Struktur, einen Fokus und meistens eine Gruppe, die denselben Rhythmus teilt.",
            "Das kann anstrengend sein, führt aber genau deshalb schneller zu einer spürbaren Veränderung – sei es mehr Ruhe, ein klareres Körpergefühl oder eine kreative Wiederaufnahme.",
          ],
        },
        {
          heading: "Für wen lohnt sich welches Format?",
          bullets: [
            "Anhaltende Müdigkeit und wenig Ausgleich: ein Wellness- oder Natur-Retreat mit klarer Tagesstruktur.",
            "Sorgen, die sich im Kopf im Kreis drehen: ein Meditations-Retreat mit Schweige-Anteilen.",
            "Wunsch, die eigene Körperwahrnehmung wieder aufzunehmen: ein Yoga-Retreat für Einsteiger oder ein mittleres Niveau.",
            "Kreative Blockade oder Projekt, das nie fertig wird: ein kreatives Retreat im Schreib-, Mal- oder Musikformat.",
          ],
        },
        {
          heading: "Online- oder Präsenz-Retreat?",
          body: "Online-Retreats funktionieren gut für kurze, stark strukturierte Formate (z. B. Meditations-Wochen). Für körperlich geprägte Formate wie Yoga, Sauna, Natur oder kreative Praxis ist ein Präsenz-Retreat deutlich wirksamer – der Ortswechsel selbst ist Teil der Wirkung.",
        },
        {
          heading: "Wie finde ich auf Freuly die passende Begleitung?",
          bullets: [
            "Filtern Sie Anbieter nach Sprache: Ukrainisch, Russisch oder Deutsch.",
            "Schauen Sie in den Profilbereich: Ausrichtung, Erfahrung, Format (Einzel, Gruppe, Wochenende, Woche).",
            "Kontaktieren Sie zwei bis drei Anbieter, schildern Sie Ihre Situation und fragen Sie nach Tagesablauf und Gruppengröße.",
            "Klären Sie vorab Nebenaspekte wie Unterkunft, Verpflegung und mögliche Kontraindikationen.",
          ],
        },
        {
          heading: "Sprache ist mehr als Übersetzung",
          body: "Gerade bei Retreats geht es oft um innere Prozesse, die sich in der Muttersprache leichter öffnen. Freuly konzentriert sich deshalb auf Anbieter, die Sie wirklich verstehen – sprachlich und kulturell – und nicht nur auf eine breite Datenbank.",
        },
      ],
      specialistsTitle: "Anbieter und Begleitpersonen",
      specialistsEmpty:
        "Sobald passende Anbieter in dieser Kategorie auf Freuly registriert sind, erscheinen sie an dieser Stelle.",
      faqTitle: "Häufige Fragen zu Retreats",
      faq: [
        {
          question: "Wie lange dauert ein sinnvolles Retreat?",
          answer:
            "Ein Wochenende reicht, um abzuschalten und einen Eindruck vom Format zu bekommen. Für spürbare Veränderungen bei Schlaf, Stress oder Praxis planen viele Teilnehmer fünf bis sieben Tage ein.",
        },
        {
          question: "Brauche ich Vorerfahrung, zum Beispiel in Yoga oder Meditation?",
          answer:
            "Nein, die meisten Retreats bieten explizit Einsteigerformate an. Wichtiger ist, ein Format zu wählen, das zu Ihrem aktuellen Energielevel und Ihren Zielen passt.",
        },
        {
          question: "Was ist mit körperlichen Einschränkungen oder chronischen Erkrankungen?",
          answer:
            "Informieren Sie die Anbieter vorab offen über Einschränkungen. Seriöse Retreats passen Übungen an oder raten bei ungeeigneten Formaten ab – das ist ein Qualitätsmerkmal.",
        },
        {
          question: "Sind Retreats auf Ukrainisch oder Russisch in Deutschland realistisch?",
          answer:
            "Ja – es gibt Anbieter, die ihre Formate bewusst mehrsprachig führen oder ukrainisch- bzw. russischsprachige Gruppen zusammenstellen. Freuly filtert genau danach.",
        },
        {
          question: "Was kosten Retreats im Schnitt?",
          answer:
            "Die Spannweite ist groß. Tagesformate beginnen oft im niedrigen dreistelligen Bereich, einwöchige Retreats mit Unterkunft und Verpflegung liegen meist höher. Preise stehen im jeweiligen Anbieterprofil.",
        },
      ],
      relatedTitle: "Verwandte Freuly-Seiten",
      relatedLinks: [
        {
          href: "health-psychology",
          label: "Psychologie, Therapie & Coaching",
          description:
            "Wenn Sie zusätzlich Gespräche oder Begleitung zu inneren Themen suchen.",
        },
        {
          href: "reisen-tourismus",
          label: "Reisen & Tourismus",
          description:
            "Reise- und Organisationsthemen rund um Ihren Retreat-Aufenthalt.",
        },
        {
          href: "touren-ausfluege",
          label: "Touren & Ausflüge",
          description:
            "Wenn Sie Ihren Aufenthalt mit Natur- oder Stadt-Entdeckungen kombinieren möchten.",
        },
      ],
      cta: {
        heading: "Bereit für eine klare Auszeit?",
        body: "Finden Sie auf Freuly Retreat-Anbieter, die Ihre Sprache sprechen, und nehmen Sie direkt Kontakt auf.",
        buttonLabel: "Retreat-Anbieter ansehen",
      },
    },
    ru: {
      slug: "retreats",
      parentSlug: null,
      locale: "ru",
      categoryType: "parent",
      metaTitle: "Ретриты в Германии – йога, медитация, велнес и не только | Freuly",
      metaDescription:
        "Разбор форматов ретритов в Германии: йога, медитация, велнес и спа, творческие и природные ретриты. Ведущие, говорящие на русском, украинском или немецком.",
      h1: "Ретриты в Германии — как выбрать подходящий формат",
      breadcrumbsLabel: "Ретриты",
      homeLabel: "Главная",
      intro: [
        "Ретрит — это осознанная пауза на несколько дней, где вы сосредотачиваетесь на чём-то одном: теле, дыхании, голове, творчестве или просто тишине. В Германии таких форматов много, и они очень разные по характеру.",
        "Эта страница помогает сориентироваться, какой формат подойдёт именно вам, и затем обратиться к ведущим на Freuly, которые говорят на вашем языке.",
      ],
      subcategoriesTitle: "Какие бывают ретриты",
      subcategories: [
        {
          slug: "yoga-retreats",
          label: "Йога-ретриты",
          description:
            "Несколько дней с устойчивым ритмом практики, работой с дыханием и простым питанием. Подходит и новичкам, и тем, кто углубляет свою практику.",
        },
        {
          slug: "meditation",
          label: "Медитационные ретриты",
          description:
            "Спокойная обстановка, сидячая и ходячая медитация, блоки молчания. Помогает, когда голова перегружена и мысли не успокаиваются.",
        },
        {
          slug: "wellness-spa",
          label: "Велнес и спа",
          description:
            "Короткие форматы с сауной, массажами, термальными бассейнами и сопровождающими занятиями. Акцент на физическое восстановление.",
        },
        {
          slug: "kreativ-retreats",
          label: "Творческие ретриты",
          description:
            "Писательские, художественные, музыкальные форматы в небольших группах. Помогают вернуться к практике, которая давно откладывалась.",
        },
      ],
      sections: [
        {
          heading: "Чем ретрит отличается от обычного отпуска",
          body: [
            "Ретрит — это не отель с открытой программой. У него есть структура, тема и, как правило, группа, которая живёт в одном ритме.",
            "Это требует дисциплины, но именно поэтому результат заметен быстрее: лучше сон, яснее голова, устойчивее тело или возвращение к своему делу.",
          ],
        },
        {
          heading: "Какой формат кому подходит",
          bullets: [
            "Накопленная усталость и мало отдыха — велнес или природный ретрит с чётким распорядком дня.",
            "Тревога и мысли, которые не останавливаются, — медитационный ретрит с частями в тишине.",
            "Желание вернуться к ощущению тела — йога-ретрит для начинающих или среднего уровня.",
            "Творческий тупик или проект, который не двигается, — писательский, художественный или музыкальный ретрит.",
          ],
        },
        {
          heading: "Онлайн или очный ретрит",
          body: "Онлайн-формат уместен для коротких и сильно структурированных программ — например, медитационной недели. Для йоги, сауны, природы и творческих практик эффект заметно сильнее в очном формате: сама смена обстановки работает как часть процесса.",
        },
        {
          heading: "Как выбрать сопровождение через Freuly",
          bullets: [
            "Отфильтруйте ведущих по языку: украинский, русский или немецкий.",
            "Изучите профиль: направление, опыт, формат (индивидуально, группа, выходные, неделя).",
            "Напишите двум-трём ведущим, опишите ситуацию и спросите о распорядке дня и размере группы.",
            "Уточните заранее проживание, питание и возможные ограничения по здоровью.",
          ],
        },
        {
          heading: "Язык — это не просто перевод",
          body: "На ретритах часто идёт разговор о внутренних процессах, и на родном языке он даётся легче. Поэтому Freuly концентрируется на ведущих, которые действительно понимают вас — и на уровне языка, и на уровне контекста, а не просто присутствуют в большой базе.",
        },
      ],
      specialistsTitle: "Ведущие и организаторы",
      specialistsEmpty:
        "Как только подходящие ведущие зарегистрируются в этой категории на Freuly, они появятся здесь.",
      faqTitle: "Частые вопросы о ретритах",
      faq: [
        {
          question: "Сколько должен длиться ретрит, чтобы был эффект",
          answer:
            "Выходных хватает, чтобы выйти из повседневного ритма и примерить формат. Для заметных изменений в сне, уровне стресса и практике многим нужно пять–семь дней.",
        },
        {
          question: "Нужен ли опыт в йоге или медитации",
          answer:
            "Чаще всего нет: у большинства форматов есть вход для новичков. Гораздо важнее выбрать ретрит, который соответствует вашему текущему состоянию и целям.",
        },
        {
          question: "Что делать, если есть ограничения по здоровью",
          answer:
            "Сразу сообщите ведущему об ограничениях. Хорошие ретриты адаптируют практику или прямо скажут, что формат не подходит, — это признак качества, а не минус.",
        },
        {
          question: "Есть ли русскоязычные и украиноязычные ретриты в Германии",
          answer:
            "Да. Есть ведущие, которые специально делают программы на русском или украинском или формируют группы под конкретный язык. Freuly помогает найти именно их.",
        },
        {
          question: "Сколько стоит ретрит в среднем",
          answer:
            "Разброс большой. Однодневные форматы начинаются от небольших сумм, а недельные с проживанием и питанием, как правило, заметно дороже. Актуальные цены указаны в профилях на Freuly.",
        },
      ],
      relatedTitle: "Смежные разделы Freuly",
      relatedLinks: [
        {
          href: "health-psychology",
          label: "Психология, терапия и коучинг",
          description:
            "Если параллельно нужно индивидуальное сопровождение по внутренним темам.",
        },
        {
          href: "reisen-tourismus",
          label: "Путешествия и туризм",
          description: "Организация поездки и размещения вокруг самого ретрита.",
        },
        {
          href: "touren-ausfluege",
          label: "Экскурсии и туры",
          description: "Если хочется совместить ретрит с открытием региона или города.",
        },
      ],
      cta: {
        heading: "Готовы к осознанной паузе?",
        body: "Найдите на Freuly ведущих, которые говорят на вашем языке, и напишите напрямую.",
        buttonLabel: "Посмотреть ведущих",
      },
    },
    ua: {
      slug: "retreats",
      parentSlug: null,
      locale: "ua",
      categoryType: "parent",
      metaTitle: "Ретрити в Німеччині – йога, медитація, велнес та інші формати | Freuly",
      metaDescription:
        "Огляд ретрит-форматів у Німеччині: йога, медитація, велнес і спа, творчі та природні ретрити. Ведучі українською, російською чи німецькою.",
      h1: "Ретрити в Німеччині — який формат обрати",
      breadcrumbsLabel: "Ретрити",
      homeLabel: "Головна",
      intro: [
        "Ретрит — це усвідомлена пауза на кілька днів, коли ви зосереджуєтеся на чомусь одному: тілі, диханні, голові, творчості або просто тиші. У Німеччині такі програми дуже різні за характером.",
        "Ця сторінка допоможе зрозуміти, який формат підходить саме вам, і звернутися до ведучих на Freuly, що говорять вашою мовою.",
      ],
      subcategoriesTitle: "Які бувають ретрити",
      subcategories: [
        {
          slug: "yoga-retreats",
          label: "Йога-ретрити",
          description:
            "Кілька днів стабільної практики, робота з диханням і просте харчування. Підходить і початківцям, і тим, хто вже має регулярну практику.",
        },
        {
          slug: "meditation",
          label: "Медитаційні ретрити",
          description:
            "Тиха атмосфера, сидяча і ходяча медитація, блоки мовчання. Допомагає, коли голова перевантажена, а думки не вщухають.",
        },
        {
          slug: "wellness-spa",
          label: "Велнес і спа",
          description:
            "Короткі формати із сауною, масажами, термальними басейнами й супровідними заняттями. Акцент на фізичному відновленні.",
        },
        {
          slug: "kreativ-retreats",
          label: "Творчі ретрити",
          description:
            "Письменницькі, художні, музичні формати в невеликих групах. Добре, коли хочеться повернутися до практики, яку відкладали.",
        },
      ],
      sections: [
        {
          heading: "Чим ретрит відрізняється від звичайної відпустки",
          body: [
            "Ретрит — це не готель із відкритою програмою. Там є чітка структура, тема і, як правило, група, що живе в одному ритмі.",
            "Це вимагає дисципліни, але саме тому ефект помітний швидше: кращий сон, ясніша голова, стабільніше тіло або повернення до справи, яку ви відклали.",
          ],
        },
        {
          heading: "Який формат кому підходить",
          bullets: [
            "Накопичена втома і мало справжнього відпочинку — велнес або природний ретрит із чітким розпорядком дня.",
            "Тривога і думки, що не зупиняються, — медитаційний ретрит із фрагментами в тиші.",
            "Бажання повернути відчуття тіла — йога-ретрит для початківців або середнього рівня.",
            "Творча пауза чи проєкт, що не рухається, — письменницький, художній або музичний ретрит.",
          ],
        },
        {
          heading: "Онлайн чи офлайн ретрит",
          body: "Онлайн працює для коротких і дуже структурованих форматів — наприклад, тижня медитації. Для йоги, сауни, природи та творчості офлайн-формат значно сильніший: сама зміна місця стає частиною процесу.",
        },
        {
          heading: "Як обрати ведучого на Freuly",
          bullets: [
            "Відфільтруйте ведучих за мовою: українська, російська або німецька.",
            "Прочитайте профіль: напрям, досвід, формат (індивідуально, група, вихідні, тиждень).",
            "Напишіть двом-трьом ведучим, опишіть свою ситуацію й запитайте про розпорядок і розмір групи.",
            "Наперед уточніть проживання, харчування та можливі обмеження за здоров’ям.",
          ],
        },
        {
          heading: "Мова — це більше, ніж переклад",
          body: "На ретритах часто йдеться про внутрішні процеси, і рідною мовою вони даються легше. Тому Freuly зосереджується на ведучих, які дійсно вас розуміють — і мовно, і культурно, — а не лише на великій базі контактів.",
        },
      ],
      specialistsTitle: "Ведучі та організатори",
      specialistsEmpty:
        "Щойно в цій категорії з’являться відповідні ведучі на Freuly, вони будуть показані тут.",
      faqTitle: "Часті питання про ретрити",
      faq: [
        {
          question: "Скільки має тривати ретрит, щоб відчути ефект",
          answer:
            "Вихідних достатньо, щоб вийти з повсякденного ритму й спробувати формат. Для помітних змін у сні, стресі чи практиці багатьом потрібно п’ять–сім днів.",
        },
        {
          question: "Чи потрібен досвід у йозі або медитації",
          answer:
            "Здебільшого ні — більшість форматів має окремі групи для початківців. Важливіше обрати ретрит, який відповідає вашому стану і цілям.",
        },
        {
          question: "Що робити, якщо є обмеження за здоров’ям",
          answer:
            "Обов’язково повідомте ведучого заздалегідь. Якісні ретрити адаптують практику або відкрито скажуть, що формат не підходить — це ознака відповідальності.",
        },
        {
          question: "Чи бувають україномовні та російськомовні ретрити в Німеччині",
          answer:
            "Так. Є ведучі, які свідомо проводять програми українською чи російською або формують двомовні групи. Freuly допомагає знайти саме їх.",
        },
        {
          question: "Скільки коштує ретрит у середньому",
          answer:
            "Розкид великий. Денні формати починаються з невеликих сум, тижневі з проживанням і харчуванням зазвичай дорожчі. Актуальні ціни вказано в профілях на Freuly.",
        },
      ],
      relatedTitle: "Суміжні розділи Freuly",
      relatedLinks: [
        {
          href: "health-psychology",
          label: "Психологія, терапія та коучинг",
          description:
            "Якщо паралельно потрібен індивідуальний супровід із внутрішніх тем.",
        },
        {
          href: "reisen-tourismus",
          label: "Подорожі та туризм",
          description: "Організація поїздки та проживання навколо самого ретриту.",
        },
        {
          href: "touren-ausfluege",
          label: "Екскурсії та тури",
          description: "Якщо хочеться поєднати ретрит з відкриттям регіону чи міста.",
        },
      ],
      cta: {
        heading: "Готові до усвідомленої паузи?",
        body: "Знайдіть на Freuly ведучих, які говорять вашою мовою, і напишіть напряму.",
        buttonLabel: "Переглянути ведучих",
      },
    },
  },
};
