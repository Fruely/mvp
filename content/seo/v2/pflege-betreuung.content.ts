import type { LocalizedSeoCategory } from "@/lib/seo/content";

/**
 * Parent category page for the Freuly SEO layer: "pflege-betreuung" hub.
 *
 * Role: umbrella page for care and everyday-assistance services in Germany
 * – senior care, home nursing, everyday help, childcare, housekeeping and
 * accompaniment. It explains the boundaries between those formats and how
 * to choose a caregiver who actually speaks the family's language.
 *
 * Routed at: `/{lang}/pflege-betreuung` (see `app/[lang]/pflege-betreuung/page.tsx`).
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
      metaTitle: "Pflege & Betreuung in Deutschland – Pflegekräfte in Ihrer Sprache | Freuly",
      metaDescription:
        "Seniorenbetreuung, Krankenpflege, Alltagshilfe und Begleitung in Deutschland. Freuly verbindet Familien mit Pflegepersonen, die Ukrainisch, Russisch oder Deutsch sprechen.",
      h1: "Pflege & Betreuung in Deutschland – Hilfe in der Sprache der Familie",
      breadcrumbsLabel: "Pflege & Betreuung",
      homeLabel: "Startseite",
      intro: [
        "Pflege und Betreuung betrifft früher oder später viele Familien: ein älter werdender Elternteil, eine Erkrankung, ein Unfall oder schlicht der Wunsch, den Alltag zu Hause weiter zu ermöglichen.",
        "Die eigentliche Frage ist selten „Pflege ja oder nein?“, sondern „welches Format passt heute?“ – und wie findet man eine Person, die nicht nur qualifiziert ist, sondern auch wirklich verstanden wird, wenn es um Medikamente, Schmerzen oder Ängste geht.",
      ],
      subcategoriesTitle: "Welche Formate gibt es?",
      subcategories: [
        {
          slug: "seniorenbetreuung",
          label: "Seniorenbetreuung",
          description:
            "Stundenweise oder regelmäßige Begleitung im Alltag, Körperpflege, Gesellschaft und emotionale Unterstützung.",
        },
        {
          slug: "krankenpflege",
          label: "Krankenpflege",
          description:
            "Fachlich qualifizierte Pflege zu Hause, zum Beispiel Medikamentengabe, Wundversorgung und Absprachen mit behandelnden Ärzten.",
        },
        {
          slug: "alltagshilfe",
          label: "Alltagshilfe",
          description:
            "Unterstützung beim Einkaufen, Kochen, Begleitung zu Terminen und leichten Tätigkeiten im Haushalt – ohne medizinische Aufgaben.",
        },
        {
          slug: "kinderbetreuung",
          label: "Kinderbetreuung",
          description:
            "Regelmäßige oder gelegentliche Betreuung von Kindern in der vertrauten Sprache der Familie.",
        },
        {
          slug: "haushaltshilfe",
          label: "Haushaltshilfe",
          description:
            "Reinigung, Wäsche und Ordnung halten im Haushalt, passend zur aktuellen Lebenssituation.",
        },
        {
          slug: "begleitdienst",
          label: "Begleitdienst",
          description:
            "Begleitung zu Arztbesuchen, Behörden oder Spaziergängen – besonders wichtig, wenn Deutschkenntnisse eingeschränkt sind.",
        },
      ],
      sections: [
        {
          heading: "Wie unterscheiden sich Seniorenbetreuung, Krankenpflege und Alltagshilfe?",
          body: [
            "Seniorenbetreuung ist breit: Begleitung, Gesellschaft, Grundpflege und Unterstützung im Alltag. Krankenpflege setzt eine Fachausbildung voraus und übernimmt medizinische Aufgaben. Alltagshilfe ist bewusst nicht-medizinisch und entlastet im täglichen Leben.",
            "In vielen Familien kombiniert sich das: eine Pflegefachkraft kommt stundenweise, eine Alltagshilfe übernimmt Einkäufe und Gesellschaft, Angehörige tragen den emotionalen Teil. Die richtige Kombination spart Ressourcen und schützt vor Überlastung.",
          ],
        },
        {
          heading: "Warum spielt die Sprache in der Pflege eine besondere Rolle?",
          bullets: [
            "Bei Demenz, Schmerzen oder akuten Krisen greifen Menschen fast immer auf die Erst- oder Muttersprache zurück.",
            "Missverständnisse in Medikamenten, Mengen oder Dosierungen sind das häufigste Risiko in der häuslichen Pflege.",
            "Vertrauen zu einer fremden Person entsteht schneller, wenn sie kulturelle Gewohnheiten, Feste und Umgangsformen kennt.",
            "Bei Behörden- oder Arztterminen ersetzt eine mehrsprachige Begleitung oft einen professionellen Dolmetscher.",
          ],
        },
        {
          heading: "Gesetzliche Leistungen und was Freuly ergänzt",
          body: "Pflege in Deutschland ist gut reguliert: Pflegekasse, Pflegegrad, Sachleistungen und Entlastungsbetrag sind die bekannten Stichworte. Freuly ersetzt diese Leistungen nicht. Wir ergänzen sie, indem wir Sie mit konkreten Personen verbinden – und zwar so, dass Sie in Ihrer Sprache klar besprechen können, welche Hilfe wirklich gebraucht wird.",
        },
        {
          heading: "Wie wähle ich die richtige Pflege- oder Betreuungsperson?",
          bullets: [
            "Bedarf zuerst klären: Welche Aufgaben sollen wirklich übernommen werden, welche bleiben bei der Familie?",
            "Sprache und Qualifikation passend zum Bedarf auswählen – Alltagshilfe braucht anderes als Wundversorgung.",
            "Zwei bis drei Profile auf Freuly vergleichen und ein kurzes Kennenlernen vereinbaren, gerne auch per Video.",
            "Arbeitszeiten, Vertretungsmöglichkeiten und Erreichbarkeit offen besprechen.",
            "Nach Erfahrung mit Demenz, Mobilitätseinschränkungen oder chronischen Erkrankungen fragen.",
          ],
        },
        {
          heading: "Vor Ort, mobil oder digital?",
          body: "Pflege ist in ihrem Kern eine Vor-Ort-Aufgabe. Digitale Begleitung kann sie nicht ersetzen, aber ergänzen – etwa durch kurze Video-Check-ins mit weiter entfernt lebenden Angehörigen oder durch Online-Beratung vor der Auswahl einer Person. Freuly ermöglicht beides.",
        },
      ],
      specialistsTitle: "Verfügbare Pflege- und Betreuungspersonen",
      specialistsEmpty:
        "Sobald passende Pflege- und Betreuungspersonen auf Freuly registriert sind, erscheinen sie hier.",
      faqTitle: "Häufige Fragen zu Pflege und Betreuung",
      faq: [
        {
          question: "Brauche ich einen Pflegegrad, um jemanden über Freuly zu finden?",
          answer:
            "Nein. Freuly ist ein Verzeichnis von Pflege- und Betreuungspersonen und nicht an einen konkreten Pflegegrad gebunden. Einen Pflegegrad brauchen Sie nur, wenn Sie Leistungen über die Pflegekasse abrechnen möchten.",
        },
        {
          question: "Worauf achte ich besonders bei Demenz?",
          answer:
            "Bei Demenz ist Sprache entscheidend: der vertraute Wortschatz beruhigt, fördert Orientierung und reduziert Aggression. Eine Pflegekraft, die die Muttersprache spricht, ist hier nicht Komfort, sondern Qualität.",
        },
        {
          question: "Was ist der Unterschied zwischen Alltagshilfe und Krankenpflege?",
          answer:
            "Alltagshilfe übernimmt nicht-medizinische Aufgaben wie Einkäufe, Begleitung und leichte Hausarbeit. Krankenpflege wird von Fachkräften geleistet und umfasst medizinische Leistungen wie Medikamentengabe, Wundversorgung oder Injektionen.",
        },
        {
          question: "Kann Freuly auch für stundenweise Unterstützung genutzt werden?",
          answer:
            "Ja. Viele Angebote sind explizit stundenweise gedacht, zum Beispiel für Arztbegleitung, Einkaufshilfe oder regelmäßige Gesellschaft. Die genauen Konditionen stehen im jeweiligen Profil.",
        },
        {
          question: "Was kostet Pflege über Freuly?",
          answer:
            "Die Preise hängen von Qualifikation, Umfang und Region ab und werden von den Anbietenden selbst angegeben. Freuly ist dabei Vermittler, nicht Arbeitgeber – konkrete Konditionen klären Sie direkt mit der Person.",
        },
      ],
      relatedTitle: "Verwandte Freuly-Seiten",
      relatedLinks: [
        {
          href: "health-psychology",
          label: "Psychologie, Therapie & Coaching",
          description:
            "Für pflegende Angehörige selbst – wenn die emotionale Belastung hoch wird.",
        },
        {
          href: "cleaning",
          label: "Reinigung",
          description: "Wenn vor allem regelmäßige Haushaltsunterstützung nötig ist.",
        },
        {
          href: "housemaster",
          label: "Hausmeister & Handwerk",
          description: "Praktische Hilfe rund um Wohnung und Haus, ergänzend zur Pflege.",
        },
      ],
      cta: {
        heading: "Suchen Sie Unterstützung, die wirklich verstanden wird?",
        body: "Finden Sie auf Freuly Pflege- und Betreuungspersonen, die die Sprache Ihrer Familie sprechen.",
        buttonLabel: "Pflegekräfte ansehen",
      },
    },
    ru: {
      slug: "pflege-betreuung",
      parentSlug: null,
      locale: "ru",
      categoryType: "parent",
      metaTitle: "Уход и сопровождение в Германии – специалисты, говорящие с вами на одном языке | Freuly",
      metaDescription:
        "Уход за пожилыми, медицинский уход на дому, помощь в быту и сопровождение в Германии. Freuly помогает найти специалистов, говорящих на русском, украинском или немецком.",
      h1: "Уход и сопровождение в Германии — помощь на языке семьи",
      breadcrumbsLabel: "Уход и сопровождение",
      homeLabel: "Главная",
      intro: [
        "Тема ухода и сопровождения рано или поздно появляется во многих семьях: пожилой родственник, болезнь, травма или просто желание сохранить привычную жизнь дома.",
        "Чаще всего вопрос не в том, нужен ли уход, а в том, какой формат подходит сейчас — и как найти человека, которого действительно понимают, когда речь идёт о лекарствах, боли или страхе.",
      ],
      subcategoriesTitle: "Какие форматы ухода бывают",
      subcategories: [
        {
          slug: "seniorenbetreuung",
          label: "Уход за пожилыми",
          description:
            "Почасовое или регулярное сопровождение, базовый уход за телом, общение и эмоциональная поддержка.",
        },
        {
          slug: "krankenpflege",
          label: "Медицинский уход",
          description:
            "Квалифицированный уход на дому: раздача лекарств, обработка ран, согласование с лечащими врачами.",
        },
        {
          slug: "alltagshilfe",
          label: "Помощь в быту",
          description:
            "Покупки, готовка, сопровождение на приёмы, лёгкая уборка — без медицинских задач.",
        },
        {
          slug: "kinderbetreuung",
          label: "Присмотр за детьми",
          description:
            "Регулярный или разовый присмотр за детьми на языке семьи.",
        },
        {
          slug: "haushaltshilfe",
          label: "Домашняя помощь",
          description:
            "Уборка, стирка, поддержание порядка — под текущие потребности семьи.",
        },
        {
          slug: "begleitdienst",
          label: "Сопровождение",
          description:
            "Сопровождение в больницу, ведомства или на прогулки — особенно важно, когда немецкий язык ограничен.",
        },
      ],
      sections: [
        {
          heading: "Чем отличаются уход за пожилыми, медицинский уход и помощь в быту",
          body: [
            "Уход за пожилыми — это широкий спектр задач: сопровождение, общение, базовая гигиена и помощь в повседневных действиях. Медицинский уход выполняется квалифицированным персоналом и включает клинические процедуры. Помощь в быту сознательно не медицинская — это разгрузка повседневности.",
            "Во многих семьях эти форматы сочетаются: медсестра приходит почасово, помощник занимается покупками и компанией, близкие берут на себя эмоциональную часть. Грамотное сочетание экономит силы и снижает риск выгорания.",
          ],
        },
        {
          heading: "Почему язык так важен именно в уходе",
          bullets: [
            "При деменции, сильной боли или остром стрессе человек почти всегда переходит на родной язык.",
            "Ошибки в дозировках лекарств чаще всего возникают из-за недопонимания, а не из-за небрежности.",
            "Доверие формируется быстрее, если специалист понимает привычки, праздники и бытовой контекст.",
            "На приёмах у врачей и в ведомствах двуязычный сопровождающий часто заменяет профессионального переводчика.",
          ],
        },
        {
          heading: "Государственные услуги и что добавляет Freuly",
          body: "Система ухода в Германии регулируется законом: Pflegekasse, Pflegegrad, натуральные услуги и Entlastungsbetrag — ключевые понятия. Freuly не заменяет эти структуры. Мы помогаем найти конкретного человека и обсудить с ним детали на вашем языке, чтобы вы действительно понимали, какая помощь нужна.",
        },
        {
          heading: "Как выбрать сотрудника по уходу",
          bullets: [
            "Сначала определите, какие задачи действительно нужно отдать, а какие останутся у семьи.",
            "Выберите уровень квалификации под задачи: помощь в быту и обработка ран — это не одно и то же.",
            "Сравните два–три профиля на Freuly и запланируйте короткое знакомство, можно по видеосвязи.",
            "Открыто обсудите график, замены и способы связи.",
            "Уточните опыт работы с деменцией, ограничениями по движению или хроническими заболеваниями.",
          ],
        },
        {
          heading: "Очно, с выездом или онлайн",
          body: "Уход по своей сути — это работа рядом с человеком. Онлайн не заменяет её, но дополняет: видеосозвоны с родственниками, которые живут далеко, или короткая онлайн-консультация перед выбором специалиста. На Freuly возможно и то, и другое.",
        },
      ],
      specialistsTitle: "Доступные специалисты по уходу",
      specialistsEmpty:
        "Когда в этой категории появятся подходящие специалисты на Freuly, они отобразятся здесь.",
      faqTitle: "Частые вопросы об уходе и сопровождении",
      faq: [
        {
          question: "Нужен ли Pflegegrad, чтобы найти специалиста через Freuly",
          answer:
            "Нет. Freuly — это каталог специалистов, и его использование не зависит от официального Pflegegrad. Pflegegrad нужен, если вы хотите оплачивать часть услуг через Pflegekasse.",
        },
        {
          question: "На что особенно обратить внимание при деменции",
          answer:
            "При деменции язык играет клиническую роль: привычный словарь успокаивает, поддерживает ориентацию и снижает агрессию. Специалист, говорящий на родном языке, — это не комфорт, а показатель качества ухода.",
        },
        {
          question: "В чём разница между помощью в быту и медицинским уходом",
          answer:
            "Помощь в быту — немедицинские задачи: покупки, сопровождение, лёгкая работа по дому. Медицинский уход выполняется квалифицированным персоналом и включает процедуры вроде перевязок, инъекций или раздачи лекарств.",
        },
        {
          question: "Можно ли найти специалиста на несколько часов в неделю",
          answer:
            "Да. Многие специалисты работают почасово: сопровождение на приём, помощь с покупками, регулярное общение. Конкретные условия указаны в профиле.",
        },
        {
          question: "Сколько стоит уход через Freuly",
          answer:
            "Цены зависят от квалификации, объёма услуг и региона и указываются самими специалистами. Freuly — это площадка-посредник, а не работодатель. Все условия обсуждаются напрямую со специалистом.",
        },
      ],
      relatedTitle: "Смежные разделы Freuly",
      relatedLinks: [
        {
          href: "health-psychology",
          label: "Психология, терапия и коучинг",
          description: "Для тех, кто сам ухаживает — когда эмоциональная нагрузка становится высокой.",
        },
        {
          href: "cleaning",
          label: "Уборка",
          description: "Если нужна прежде всего регулярная помощь по хозяйству.",
        },
        {
          href: "housemaster",
          label: "Мастер на дом",
          description: "Практическая помощь по дому, в дополнение к уходу.",
        },
      ],
      cta: {
        heading: "Нужна поддержка, которую действительно понимают?",
        body: "Найдите на Freuly специалистов по уходу, говорящих на языке вашей семьи.",
        buttonLabel: "Посмотреть специалистов",
      },
    },
    ua: {
      slug: "pflege-betreuung",
      parentSlug: null,
      locale: "ua",
      categoryType: "parent",
      metaTitle: "Догляд і супровід у Німеччині – спеціалісти, які говорять з вами однією мовою | Freuly",
      metaDescription:
        "Догляд за літніми, медичний догляд удома, побутова допомога і супровід у Німеччині. Freuly допомагає знайти фахівців, які говорять українською, російською або німецькою.",
      h1: "Догляд і супровід у Німеччині — допомога мовою родини",
      breadcrumbsLabel: "Догляд і супровід",
      homeLabel: "Головна",
      intro: [
        "Тема догляду рано чи пізно виникає в багатьох родинах: літній родич, хвороба, травма або просто прагнення зберегти звичне життя вдома.",
        "Запитання зазвичай не «чи потрібен догляд», а «який формат підходить саме зараз» — і як знайти людину, яку дійсно розуміють, коли йдеться про ліки, біль чи тривогу.",
      ],
      subcategoriesTitle: "Які формати догляду існують",
      subcategories: [
        {
          slug: "seniorenbetreuung",
          label: "Догляд за літніми",
          description:
            "Погодинний чи регулярний супровід, базовий догляд за тілом, спілкування та емоційна підтримка.",
        },
        {
          slug: "krankenpflege",
          label: "Медичний догляд",
          description:
            "Кваліфікований догляд удома: видача ліків, обробка ран, координація з лікарями.",
        },
        {
          slug: "alltagshilfe",
          label: "Побутова допомога",
          description:
            "Покупки, приготування їжі, супровід на прийоми, легке прибирання — без медичних задач.",
        },
        {
          slug: "kinderbetreuung",
          label: "Догляд за дітьми",
          description:
            "Регулярний або разовий догляд за дітьми мовою родини.",
        },
        {
          slug: "haushaltshilfe",
          label: "Домашня допомога",
          description:
            "Прибирання, прання, підтримання порядку — відповідно до поточної ситуації в родині.",
        },
        {
          slug: "begleitdienst",
          label: "Супровід",
          description:
            "Супровід у лікарню, установи або на прогулянки — особливо важливо, коли володіння німецькою обмежене.",
        },
      ],
      sections: [
        {
          heading: "Чим відрізняються догляд за літніми, медичний догляд і побутова допомога",
          body: [
            "Догляд за літніми — це широкий спектр задач: супровід, спілкування, базова гігієна та допомога у повсякденних справах. Медичний догляд виконує кваліфікований персонал і включає процедури на кшталт ін’єкцій чи обробки ран. Побутова допомога свідомо не є медичною — це розвантаження щоденних обов’язків.",
            "У багатьох родинах ці формати поєднуються: медсестра приходить погодинно, помічниця бере покупки й спілкування, близькі беруть на себе емоційну частину. Продумана комбінація заощаджує сили й знижує ризик вигорання.",
          ],
        },
        {
          heading: "Чому мова важлива саме в догляді",
          bullets: [
            "При деменції, сильному болі чи гострій тривозі людина майже завжди повертається до рідної мови.",
            "Більшість помилок із дозуванням ліків удома виникає через непорозуміння, а не через недбалість.",
            "Довіра до сторонньої людини формується швидше, якщо вона розуміє традиції, свята і побутовий контекст.",
            "На прийомах у лікарів та в установах двомовний супровід часто замінює професійного перекладача.",
          ],
        },
        {
          heading: "Державні послуги й чим їх доповнює Freuly",
          body: "Догляд у Німеччині врегульований: Pflegekasse, Pflegegrad, натуральні послуги та Entlastungsbetrag — ключові поняття. Freuly не замінює цю систему. Ми допомагаємо знайти конкретну людину та обговорити деталі вашою мовою, щоб ви дійсно розуміли, яка саме підтримка потрібна.",
        },
        {
          heading: "Як обрати фахівця з догляду",
          bullets: [
            "Спершу чітко визначте, які задачі справді треба делегувати, а які залишаться в родині.",
            "Обирайте кваліфікацію під завдання: побутова допомога і обробка ран — це різні речі.",
            "Порівняйте два-три профілі на Freuly та заплануйте коротке знайомство, можна відеозв’язком.",
            "Відкрито обговоріть графік, можливі заміни та доступність.",
            "Запитайте про досвід роботи з деменцією, обмеженнями мобільності або хронічними захворюваннями.",
          ],
        },
        {
          heading: "Офлайн, з виїздом або онлайн",
          body: "Догляд — це переважно робота поруч із людиною. Онлайн-формат не замінює її, але доповнює: короткі відеодзвінки з родичами, які живуть далеко, або онлайн-консультація до вибору фахівця. На Freuly можливі обидва сценарії.",
        },
      ],
      specialistsTitle: "Доступні фахівці з догляду",
      specialistsEmpty:
        "Щойно в цій категорії з’являться відповідні фахівці на Freuly, вони будуть показані тут.",
      faqTitle: "Часті питання про догляд і супровід",
      faq: [
        {
          question: "Чи потрібен Pflegegrad, щоб знайти фахівця через Freuly",
          answer:
            "Ні. Freuly — це каталог фахівців, його використання не залежить від офіційного Pflegegrad. Pflegegrad потрібен, якщо ви хочете компенсувати частину витрат через Pflegekasse.",
        },
        {
          question: "На що особливо звернути увагу у випадку деменції",
          answer:
            "При деменції мова має клінічне значення: звичні слова заспокоюють, підтримують орієнтацію і зменшують агресію. Фахівець, що говорить рідною мовою, — це не комфорт, а якість догляду.",
        },
        {
          question: "У чому різниця між побутовою допомогою та медичним доглядом",
          answer:
            "Побутова допомога — це немедичні задачі: покупки, супровід, легке прибирання. Медичний догляд виконують кваліфіковані працівники, це включає процедури на кшталт перев’язок, ін’єкцій чи видачі ліків.",
        },
        {
          question: "Чи можна знайти фахівця лише на кілька годин на тиждень",
          answer:
            "Так. Багато фахівців працюють погодинно: супровід на прийом, допомога з покупками, регулярне спілкування. Конкретні умови вказані в профілі.",
        },
        {
          question: "Скільки коштує догляд через Freuly",
          answer:
            "Вартість залежить від кваліфікації, обсягу послуг і регіону й встановлюється самими фахівцями. Freuly — це майданчик-посередник, а не роботодавець. Умови ви узгоджуєте напряму зі спеціалістом.",
        },
      ],
      relatedTitle: "Суміжні розділи Freuly",
      relatedLinks: [
        {
          href: "health-psychology",
          label: "Психологія, терапія та коучинг",
          description:
            "Для тих, хто сам доглядає — коли емоційне навантаження стає високим.",
        },
        {
          href: "cleaning",
          label: "Прибирання",
          description: "Якщо потрібна насамперед регулярна допомога по дому.",
        },
        {
          href: "housemaster",
          label: "Майстер на дім",
          description: "Практична допомога по дому, додатково до догляду.",
        },
      ],
      cta: {
        heading: "Потрібна підтримка, яку дійсно розуміють?",
        body: "Знайдіть на Freuly фахівців із догляду, які говорять мовою вашої родини.",
        buttonLabel: "Переглянути фахівців",
      },
    },
  },
};
