type CommercialLang = "ua" | "ru" | "de";
type Dict = Record<string, unknown>;

const OVERRIDES: Record<CommercialLang, Dict> = {
  ru: {
    pricing: {
      hero: {
        kicker: "Специалистам",
        title: "Подключите канал клиентских заявок Freuly",
        subtitle:
          "Professional включает доступ к заявкам в рамках тарифа. Growth добавляет расширенную профессиональную страницу и редакторскую упаковку.",
      },
      notice: {
        title: "Как начинается работа с Freuly",
        lead:
          "Зарегистрируйтесь и подготовьте профиль. После публикации подходящие заявки можно покупать отдельно. Professional или Growth включают доступ к заявкам в рамках тарифа и не являются условием участия в канале.",
        points: [
          "Неполный профиль сохраняется как черновик и не виден клиентам.",
          "Черновик можно редактировать и оставить на потом без обязательств.",
          "После публикации вы можете получать подходящие заявки без подписки и покупать их отдельно.",
          "Каждый оплаченный период завершается автоматически; следующий месяц подключается вручную через checkout.",
        ],
      },
      faq: [
        {
          q: "Можно ли сначала заполнить профиль и решить позже?",
          a: "Да. Данные сохраняются как черновик, пока профиль не опубликован. Публикация не требует оплаты тарифа. После публикации подходящие заявки можно покупать отдельно.",
        },
        {
          q: "Когда профиль становится видимым клиентам?",
          a: "После публикации заполненного профиля. Подписка Professional или Growth для публикации не требуется.",
        },
        {
          q: "Есть ли бесплатный период публичного размещения?",
          a: "Нет. Бесплатно можно подготовить черновик и опубликовать профиль. Подписка Professional или Growth включает доступ к заявкам в рамках тарифа; без неё подходящие заявки можно покупать отдельно.",
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
            "Для ранее подключённых специалистов может действовать переходный режим по индивидуальным условиям. Для новых специалистов подписка не обязательна: после публикации подходящие заявки можно покупать отдельно.",
          general:
            "Подписка Professional или Growth включает доступ к контактам подходящих заявок в рамках тарифа. Без подписки профиль может быть опубликован, а подходящие заявки можно покупать отдельно. Автоматического повторного списания нет.",
        },
      },
      subscriptionNotice: {
        earlyAccessTitle: "Переходный режим",
        earlyAccessBody:
          "Для вашего ранее созданного аккаунта действует переходный режим. Он не является общедоступным бесплатным тарифом для новых специалистов.",
        inactiveTitle: "Вы работаете без подписки",
        inactiveBody:
          "Вы работаете без подписки. Подходящие заявки можно покупать отдельно. Подключите Professional или Growth, если хотите получать доступ к заявкам в рамках тарифа.",
        leadsInactive:
          "Вы работаете без подписки. Подходящие заявки можно покупать отдельно. Подключите Professional или Growth, если хотите получать доступ к заявкам в рамках тарифа.",
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
          "Контакты этой заявки закрыты. Их можно открыть покупкой отдельно или в рамках тарифа Professional или Growth.",
      },
    },
  },
  ua: {
    pricing: {
      hero: {
        kicker: "Спеціалістам",
        title: "Підключіть канал клієнтських запитів Freuly",
        subtitle:
          "Professional включає доступ до запитів у межах тарифу. Growth додає розширену професійну сторінку та редакторське оформлення.",
      },
      notice: {
        title: "Як починається робота з Freuly",
        lead:
          "Зареєструйтеся та підготуйте профіль. Після публікації відповідні запити можна купувати окремо. Professional або Growth включають доступ до запитів у межах тарифу і не є умовою участі в каналі.",
        points: [
          "Неповний профіль зберігається як чернетка і не видимий клієнтам.",
          "Чернетку можна редагувати та залишити на потім без зобов’язань.",
          "Після публікації ви можете отримувати відповідні запити без підписки і купувати їх окремо.",
          "Кожен оплачений період завершується автоматично; наступний місяць підключається вручну через checkout.",
        ],
      },
      faq: [
        {
          q: "Чи можна спочатку заповнити профіль і вирішити пізніше?",
          a: "Так. Дані зберігаються як чернетка, поки профіль не опубліковано. Публікація не потребує оплати тарифу. Після публікації відповідні запити можна купувати окремо.",
        },
        {
          q: "Коли профіль стає видимим клієнтам?",
          a: "Після публікації заповненого профілю. Підписка Professional або Growth для публікації не потрібна.",
        },
        {
          q: "Чи є безкоштовний період публічного розміщення?",
          a: "Ні. Безкоштовно можна підготувати чернетку і опублікувати профіль. Підписка Professional або Growth включає доступ до запитів у межах тарифу; без неї відповідні запити можна купувати окремо.",
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
            "Для раніше підключених спеціалістів може діяти перехідний режим за індивідуальними умовами. Для нових спеціалістів підписка не обов’язкова: після публікації відповідні запити можна купувати окремо.",
          general:
            "Підписка Professional або Growth включає доступ до контактів відповідних запитів у межах тарифу. Без підписки профіль може бути опублікований, а відповідні запити можна купувати окремо. Автоматичного повторного списання немає.",
        },
      },
      subscriptionNotice: {
        earlyAccessTitle: "Перехідний режим",
        earlyAccessBody:
          "Для вашого раніше створеного акаунта діє перехідний режим. Він не є загальнодоступним безкоштовним тарифом для нових спеціалістів.",
        inactiveTitle: "Ви працюєте без підписки",
        inactiveBody:
          "Ви працюєте без підписки. Відповідні запити можна купувати окремо. Підключіть Professional або Growth, якщо хочете отримувати доступ до запитів у межах тарифу.",
        leadsInactive:
          "Ви працюєте без підписки. Відповідні запити можна купувати окремо. Підключіть Professional або Growth, якщо хочете отримувати доступ до запитів у межах тарифу.",
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
          "Контакти цього запиту закриті. Їх можна відкрити покупкою окремо або в межах тарифу Professional або Growth.",
      },
    },
  },
  de: {
    pricing: {
      hero: {
        kicker: "Für Spezialisten",
        title: "Aktivieren Sie Ihren Kanal für Kundenanfragen bei Freuly",
        subtitle:
          "Professional enthält den Zugang zu Anfragen im Rahmen des Tarifs. Growth ergänzt eine erweiterte professionelle Seite und redaktionelle Aufbereitung.",
      },
      notice: {
        title: "So starten Sie mit Freuly",
        lead:
          "Registrieren Sie sich und bereiten Sie Ihr Profil vor. Nach der Veröffentlichung können passende Anfragen einzeln gekauft werden. Professional oder Growth enthalten den Zugang zu Anfragen im Rahmen des Tarifs und sind keine Voraussetzung für die Teilnahme am Kanal.",
        points: [
          "Ein unvollständiges Profil bleibt als Entwurf gespeichert und für Kunden unsichtbar.",
          "Der Entwurf kann bearbeitet und ohne Verpflichtung für später gespeichert werden.",
          "Nach der Veröffentlichung können Sie passende Anfragen ohne Abo erhalten und einzeln kaufen.",
          "Jeder bezahlte Zeitraum endet automatisch; der nächste Monat wird manuell im Checkout aktiviert.",
        ],
      },
      faq: [
        {
          q: "Kann ich mein Profil zuerst ausfüllen und später entscheiden?",
          a: "Ja. Die Daten bleiben als Entwurf gespeichert, solange das Profil nicht veröffentlicht ist. Die Veröffentlichung erfordert keine Tarifzahlung. Nach der Veröffentlichung können passende Anfragen einzeln gekauft werden.",
        },
        {
          q: "Wann wird mein Profil für Kunden sichtbar?",
          a: "Nach Veröffentlichung eines vollständigen Profils. Ein Professional- oder Growth-Abo ist dafür nicht erforderlich.",
        },
        {
          q: "Gibt es eine kostenlose Phase für die öffentliche Veröffentlichung?",
          a: "Nein. Kostenlos können Sie einen Entwurf vorbereiten und das Profil veröffentlichen. Professional oder Growth enthalten den Zugang zu Anfragen im Rahmen des Tarifs; ohne Abo können passende Anfragen einzeln gekauft werden.",
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
            "Für bereits früher verbundene Spezialisten kann ein individueller Übergangsmodus gelten. Für neue Spezialisten ist kein Abo erforderlich: nach der Veröffentlichung können passende Anfragen einzeln gekauft werden.",
          general:
            "Professional oder Growth enthalten den Zugang zu Kontakten passender Anfragen im Rahmen des Tarifs. Ohne Abo kann das Profil veröffentlicht werden, und passende Anfragen können einzeln gekauft werden. Es gibt keine automatische wiederkehrende Abbuchung.",
        },
      },
      subscriptionNotice: {
        earlyAccessTitle: "Übergangsmodus",
        earlyAccessBody:
          "Für Ihr bereits früher erstelltes Konto gilt ein Übergangsmodus. Dies ist kein allgemein verfügbarer kostenloser Tarif für neue Spezialisten.",
        inactiveTitle: "Sie arbeiten ohne Abo",
        inactiveBody:
          "Sie arbeiten ohne Abo. Passende Anfragen können einzeln gekauft werden. Aktivieren Sie Professional oder Growth, wenn Sie Zugang zu Anfragen im Rahmen des Tarifs erhalten möchten.",
        leadsInactive:
          "Sie arbeiten ohne Abo. Passende Anfragen können einzeln gekauft werden. Aktivieren Sie Professional oder Growth, wenn Sie Zugang zu Anfragen im Rahmen des Tarifs erhalten möchten.",
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
          "Die Kontakte dieser Anfrage sind gesperrt. Sie können einzeln gekauft oder im Rahmen von Professional oder Growth freigeschaltet werden.",
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
