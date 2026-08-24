type CommercialLang = "ua" | "ru" | "de";
type Dict = Record<string, unknown>;

const OVERRIDES: Record<CommercialLang, Dict> = {
  ru: {
    pricing: {
      hero: {
        kicker: "Специалистам",
        title: "Подключите канал клиентских заявок Freuly",
        subtitle:
          "Professional подключает коммерческое участие в канале заявок. Growth добавляет расширенную профессиональную страницу и редакторскую упаковку.",
      },
      notice: {
        title: "Как начинается работа с Freuly",
        lead:
          "Зарегистрируйтесь и подготовьте профиль как черновик. Публичная видимость и участие в получении клиентских заявок включаются только после оплаты Professional или Growth.",
        points: [
          "До оплаты профиль сохраняется как невидимый черновик.",
          "Черновик можно редактировать и оставить на потом без обязательств.",
          "После успешной оплаты профиль публикуется и канал клиентских заявок активируется.",
          "Каждый оплаченный период завершается автоматически; следующий месяц подключается вручную через checkout.",
        ],
      },
      faq: [
        {
          q: "Можно ли сначала заполнить профиль и решить позже?",
          a: "Да. Данные сохраняются как черновик. Пока тариф не оплачен, профиль не публикуется и не участвует в получении клиентских заявок.",
        },
        {
          q: "Когда профиль становится видимым клиентам?",
          a: "После успешной оплаты Freuly Professional или Freuly Growth и автоматической публикации профиля.",
        },
        {
          q: "Есть ли бесплатный период публичного размещения?",
          a: "Нет. Бесплатно можно подготовить только невидимый черновик. Публичное размещение и коммерческое участие в канале заявок начинаются после оплаты.",
        },
        {
          q: "Продлевается ли подписка автоматически?",
          a: "Нет. Каждый оплаченный период завершается автоматически. Следующий месяц подключается вручную через checkout.",
        },
      ],
    },
    dashboard: {
      subscriptionPage: {
        label: { graceUntil: "Период восстановления оплаты до" },
        status: {
          early_access: "Переходный доступ",
          trialing: "Переходный доступ",
          grace: "Восстановление оплаты",
          grace_period: "Восстановление оплаты",
        },
        context: {
          earlyAccess:
            "Для ранее подключённых специалистов может действовать переходный режим по индивидуальным условиям. Для новых специалистов публичный профиль и канал заявок активируются после оплаты Professional или Growth.",
          general:
            "Публичный профиль и коммерческое участие в канале клиентских заявок работают при действующем Professional или Growth. Автоматического повторного списания нет.",
        },
      },
      subscriptionNotice: {
        earlyAccessTitle: "Переходный режим",
        earlyAccessBody:
          "Для вашего ранее созданного аккаунта действует переходный режим. Он не является общедоступным бесплатным тарифом для новых специалистов.",
        inactiveTitle: "Канал заявок не активирован",
        inactiveBody:
          "Публичная видимость и коммерческое участие в канале заявок сейчас не активны. Подключите Professional или Growth.",
        leadsInactive:
          "Коммерческое участие в канале заявок не активно. Подключите Professional или Growth, чтобы получать новые подходящие запросы.",
        graceTitle: "Нужно восстановить оплату",
        graceBody:
          "Оплата требует восстановления. До завершения периода осталось дней: {{days}}. Продлите тариф, чтобы сохранить коммерческий доступ без перерыва.",
        graceBodyNoDays:
          "Оплата требует восстановления. Продлите тариф, чтобы сохранить коммерческий доступ.",
        leadsGrace:
          "Период восстановления оплаты активен (осталось дней: {{days}}). Продлите тариф, чтобы сохранить доступ к новым заявкам.",
        leadsGraceNoDays:
          "Период восстановления оплаты активен. Продлите тариф, чтобы сохранить доступ к новым заявкам.",
      },
      leads: {
        unlockRequiresPlan:
          "Чтобы открыть контакты, нужен действующий Professional или Growth либо активный период восстановления оплаты.",
      },
    },
  },
  ua: {
    pricing: {
      hero: {
        kicker: "Спеціалістам",
        title: "Підключіть канал клієнтських запитів Freuly",
        subtitle:
          "Professional підключає комерційну участь у каналі запитів. Growth додає розширену професійну сторінку та редакторське оформлення.",
      },
      notice: {
        title: "Як починається робота з Freuly",
        lead:
          "Зареєструйтеся та підготуйте профіль як чернетку. Публічна видимість і участь в отриманні клієнтських запитів вмикаються лише після оплати Professional або Growth.",
        points: [
          "До оплати профіль зберігається як невидима чернетка.",
          "Чернетку можна редагувати та залишити на потім без зобов’язань.",
          "Після успішної оплати профіль публікується, а канал клієнтських запитів активується.",
          "Кожен оплачений період завершується автоматично; наступний місяць підключається вручну через checkout.",
        ],
      },
      faq: [
        {
          q: "Чи можна спочатку заповнити профіль і вирішити пізніше?",
          a: "Так. Дані зберігаються як чернетка. Поки тариф не оплачено, профіль не публікується і не бере участі в отриманні клієнтських запитів.",
        },
        {
          q: "Коли профіль стає видимим клієнтам?",
          a: "Після успішної оплати Freuly Professional або Freuly Growth та автоматичної публікації профілю.",
        },
        {
          q: "Чи є безкоштовний період публічного розміщення?",
          a: "Ні. Безкоштовно можна підготувати лише невидиму чернетку. Публічне розміщення і комерційна участь у каналі запитів починаються після оплати.",
        },
        {
          q: "Чи продовжується підписка автоматично?",
          a: "Ні. Кожен оплачений період завершується автоматично. Наступний місяць підключається вручну через checkout.",
        },
      ],
    },
    dashboard: {
      subscriptionPage: {
        label: { graceUntil: "Період відновлення оплати до" },
        status: {
          early_access: "Перехідний доступ",
          trialing: "Перехідний доступ",
          grace: "Відновлення оплати",
          grace_period: "Відновлення оплати",
        },
        context: {
          earlyAccess:
            "Для раніше підключених спеціалістів може діяти перехідний режим за індивідуальними умовами. Для нових спеціалістів публічний профіль і канал запитів активуються після оплати Professional або Growth.",
          general:
            "Публічний профіль і комерційна участь у каналі клієнтських запитів працюють за чинного Professional або Growth. Автоматичного повторного списання немає.",
        },
      },
      subscriptionNotice: {
        earlyAccessTitle: "Перехідний режим",
        earlyAccessBody:
          "Для вашого раніше створеного акаунта діє перехідний режим. Він не є загальнодоступним безкоштовним тарифом для нових спеціалістів.",
        inactiveTitle: "Канал запитів не активовано",
        inactiveBody:
          "Публічна видимість і комерційна участь у каналі запитів зараз не активні. Підключіть Professional або Growth.",
        leadsInactive:
          "Комерційна участь у каналі запитів не активна. Підключіть Professional або Growth, щоб отримувати нові відповідні запити.",
        graceTitle: "Потрібно відновити оплату",
        graceBody:
          "Оплата потребує відновлення. До завершення періоду залишилося днів: {{days}}. Продовжте тариф, щоб зберегти комерційний доступ без перерви.",
        graceBodyNoDays:
          "Оплата потребує відновлення. Продовжте тариф, щоб зберегти комерційний доступ.",
        leadsGrace:
          "Період відновлення оплати активний (залишилося днів: {{days}}). Продовжте тариф, щоб зберегти доступ до нових запитів.",
        leadsGraceNoDays:
          "Період відновлення оплати активний. Продовжте тариф, щоб зберегти доступ до нових запитів.",
      },
      leads: {
        unlockRequiresPlan:
          "Щоб відкрити контакти, потрібен чинний Professional або Growth або активний період відновлення оплати.",
      },
    },
  },
  de: {
    pricing: {
      hero: {
        kicker: "Für Spezialisten",
        title: "Aktivieren Sie Ihren Kanal für Kundenanfragen bei Freuly",
        subtitle:
          "Professional aktiviert die kommerzielle Teilnahme am Anfragekanal. Growth ergänzt eine erweiterte professionelle Seite und redaktionelle Aufbereitung.",
      },
      notice: {
        title: "So starten Sie mit Freuly",
        lead:
          "Registrieren Sie sich und bereiten Sie Ihr Profil als Entwurf vor. Öffentliche Sichtbarkeit und die Teilnahme an Kundenanfragen werden erst nach der Zahlung von Professional oder Growth aktiviert.",
        points: [
          "Vor der Zahlung bleibt das Profil ein nicht sichtbarer Entwurf.",
          "Der Entwurf kann bearbeitet und ohne Verpflichtung für später gespeichert werden.",
          "Nach erfolgreicher Zahlung wird das Profil veröffentlicht und der Kundenanfrage-Kanal aktiviert.",
          "Jeder bezahlte Zeitraum endet automatisch; der nächste Monat wird manuell im Checkout aktiviert.",
        ],
      },
      faq: [
        {
          q: "Kann ich mein Profil zuerst ausfüllen und später entscheiden?",
          a: "Ja. Die Daten bleiben als Entwurf gespeichert. Solange kein Tarif bezahlt ist, wird das Profil nicht veröffentlicht und nimmt nicht am Kundenanfrage-Kanal teil.",
        },
        {
          q: "Wann wird mein Profil für Kunden sichtbar?",
          a: "Nach erfolgreicher Zahlung von Freuly Professional oder Freuly Growth und der automatischen Veröffentlichung des Profils.",
        },
        {
          q: "Gibt es eine kostenlose Phase für die öffentliche Veröffentlichung?",
          a: "Nein. Kostenlos kann nur ein nicht sichtbarer Entwurf vorbereitet werden. Öffentliche Sichtbarkeit und kommerzielle Teilnahme am Anfragekanal beginnen nach der Zahlung.",
        },
        {
          q: "Verlängert sich das Abonnement automatisch?",
          a: "Nein. Jeder bezahlte Zeitraum endet automatisch. Der nächste Monat wird manuell im Checkout aktiviert.",
        },
      ],
    },
    dashboard: {
      subscriptionPage: {
        label: { graceUntil: "Zahlungswiederherstellung bis" },
        status: {
          early_access: "Übergangszugang",
          trialing: "Übergangszugang",
          grace: "Zahlungswiederherstellung",
          grace_period: "Zahlungswiederherstellung",
        },
        context: {
          earlyAccess:
            "Für bereits früher verbundene Spezialisten kann ein individueller Übergangsmodus gelten. Für neue Spezialisten werden öffentliches Profil und Anfragekanal erst nach Zahlung von Professional oder Growth aktiviert.",
          general:
            "Öffentliches Profil und kommerzielle Teilnahme am Kundenanfrage-Kanal gelten bei aktivem Professional oder Growth. Es gibt keine automatische wiederkehrende Abbuchung.",
        },
      },
      subscriptionNotice: {
        earlyAccessTitle: "Übergangsmodus",
        earlyAccessBody:
          "Für Ihr bereits früher erstelltes Konto gilt ein Übergangsmodus. Dies ist kein allgemein verfügbarer kostenloser Tarif für neue Spezialisten.",
        inactiveTitle: "Anfragekanal nicht aktiviert",
        inactiveBody:
          "Öffentliche Sichtbarkeit und kommerzielle Teilnahme am Anfragekanal sind derzeit nicht aktiv. Aktivieren Sie Professional oder Growth.",
        leadsInactive:
          "Die kommerzielle Teilnahme am Anfragekanal ist nicht aktiv. Aktivieren Sie Professional oder Growth, um neue passende Anfragen zu erhalten.",
        graceTitle: "Zahlung muss wiederhergestellt werden",
        graceBody:
          "Die Zahlung muss wiederhergestellt werden. Verbleibende Tage: {{days}}. Verlängern Sie den Tarif, um den kommerziellen Zugang ohne Unterbrechung zu erhalten.",
        graceBodyNoDays:
          "Die Zahlung muss wiederhergestellt werden. Verlängern Sie den Tarif, um den kommerziellen Zugang zu erhalten.",
        leadsGrace:
          "Zahlungswiederherstellung aktiv (verbleibende Tage: {{days}}). Verlängern Sie den Tarif, um Zugang zu neuen Anfragen zu behalten.",
        leadsGraceNoDays:
          "Zahlungswiederherstellung aktiv. Verlängern Sie den Tarif, um Zugang zu neuen Anfragen zu behalten.",
      },
      leads: {
        unlockRequiresPlan:
          "Zum Öffnen der Kontaktdaten ist ein aktiver Professional- oder Growth-Tarif oder eine aktive Zahlungswiederherstellung erforderlich.",
      },
    },
  },
};

function isPlainObject(value: unknown): value is Dict {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function merge(target: Dict, patch: Dict): Dict {
  const result: Dict = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = merge(result[key] as Dict, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function applyCommercialCopyOverrides(lang: CommercialLang, dictionary: Dict): Dict {
  return merge(dictionary, OVERRIDES[lang]);
}
