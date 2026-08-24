type CommercialLang = "ua" | "ru" | "de";
type Dict = Record<string, unknown>;

const OVERRIDES: Record<CommercialLang, Dict> = {
  ru: {
    application: {
      pricingNote:
        "Регистрация и подготовка черновика не требуют оплаты. Публичная видимость и участие в канале клиентских заявок включаются после активации Freuly Professional или Freuly Growth.",
    },
    dashboard: {
      billingPage: {
        title: "Оплата и активация канала заявок",
        subtitle:
          "Здесь вы можете выбрать Professional или Growth, активировать коммерческое участие в канале клиентских заявок и управлять оплатой.",
        graceNotice:
          "Текущий оплаченный период требует восстановления оплаты до {{graceUntil}}. Продлите тариф, чтобы сохранить коммерческое участие в канале заявок без перерыва.",
        graceNoticeNoDays:
          "Текущий оплаченный период требует восстановления оплаты. Продлите тариф, чтобы сохранить коммерческое участие в канале заявок.",
        inactiveNotice:
          "Коммерческое участие в канале заявок и публичная видимость сейчас не активны. После оплаты Professional или Growth доступ будет восстановлен.",
        planPicker: {
          title: "Выберите уровень подключения",
          subtitle:
            "Оба тарифа подключают коммерческое участие в канале клиентских заявок. Growth дополнительно включает расширенную профессиональную страницу и редакторскую упаковку.",
          professionalHint:
            "Канал клиентских заявок, публичный профиль, самостоятельное ведение и до 5 фото в галерее.",
          growthHint:
            "Канал клиентских заявок плюс расширенная профессиональная страница, редакторская упаковка и до 15 фото.",
        },
      },
      home: {
        incompleteBody:
          "Заполните обязательные данные, чтобы подготовить черновик к активации Professional или Growth.",
        subscription: {
          grace: "Восстановление оплаты до",
          cta: "Статус канала и тарифа",
          ctaChoosePlan: "Активировать канал заявок",
          ctaPay: "Продлить тариф",
          ctaUrgent: "Восстановить оплату",
        },
        statusHint: {
          approved: "Ваш профиль опубликован и участвует в работе Freuly согласно текущему статусу доступа.",
        },
      },
      introBanner:
        "Заполните данные профиля и услуги. Для новых специалистов публичная видимость и канал клиентских заявок активируются после оплаты Professional или Growth.",
      important: {
        title: "Важно",
        body:
          "Сначала сохраните изменения. Публичная видимость нового профиля зависит от действующего Professional или Growth.",
      },
    },
  },
  ua: {
    application: {
      pricingNote:
        "Реєстрація та підготовка чернетки не потребують оплати. Публічна видимість і участь у каналі клієнтських запитів вмикаються після активації Freuly Professional або Freuly Growth.",
    },
    dashboard: {
      billingPage: {
        title: "Оплата та активація каналу запитів",
        subtitle:
          "Тут ви можете вибрати Professional або Growth, активувати комерційну участь у каналі клієнтських запитів та керувати оплатою.",
        graceNotice:
          "Поточний оплачений період потребує відновлення оплати до {{graceUntil}}. Продовжте тариф, щоб зберегти комерційну участь у каналі запитів без перерви.",
        graceNoticeNoDays:
          "Поточний оплачений період потребує відновлення оплати. Продовжте тариф, щоб зберегти комерційну участь у каналі запитів.",
        inactiveNotice:
          "Комерційна участь у каналі запитів і публічна видимість зараз не активні. Після оплати Professional або Growth доступ буде відновлено.",
        planPicker: {
          title: "Оберіть рівень підключення",
          subtitle:
            "Обидва тарифи підключають комерційну участь у каналі клієнтських запитів. Growth додатково включає розширену професійну сторінку та редакторське оформлення.",
          professionalHint:
            "Канал клієнтських запитів, публічний профіль, самостійне ведення та до 5 фото в галереї.",
          growthHint:
            "Канал клієнтських запитів плюс розширена професійна сторінка, редакторське оформлення та до 15 фото.",
        },
      },
      home: {
        incompleteBody:
          "Заповніть обов’язкові дані, щоб підготувати чернетку до активації Professional або Growth.",
        subscription: {
          grace: "Відновлення оплати до",
          cta: "Статус каналу і тарифу",
          ctaChoosePlan: "Активувати канал запитів",
          ctaPay: "Продовжити тариф",
          ctaUrgent: "Відновити оплату",
        },
        statusHint: {
          approved: "Ваш профіль опубліковано й він бере участь у роботі Freuly відповідно до поточного статусу доступу.",
        },
      },
      introBanner:
        "Заповніть дані профілю та послуги. Для нових спеціалістів публічна видимість і канал клієнтських запитів активуються після оплати Professional або Growth.",
      important: {
        title: "Важливо",
        body:
          "Спочатку збережіть зміни. Публічна видимість нового профілю залежить від чинного Professional або Growth.",
      },
    },
  },
  de: {
    application: {
      pricingNote:
        "Registrierung und Vorbereitung des Entwurfs sind ohne Tarifzahlung möglich. Öffentliche Sichtbarkeit und die Teilnahme am Kundenanfrage-Kanal werden nach Aktivierung von Freuly Professional oder Freuly Growth freigeschaltet.",
    },
    dashboard: {
      billingPage: {
        title: "Zahlung und Aktivierung des Anfragekanals",
        subtitle:
          "Hier können Sie Professional oder Growth wählen, die kommerzielle Teilnahme am Kundenanfrage-Kanal aktivieren und Ihre Zahlung verwalten.",
        graceNotice:
          "Für den aktuellen bezahlten Zeitraum muss die Zahlung bis {{graceUntil}} wiederhergestellt werden. Verlängern Sie den Tarif, um die kommerzielle Teilnahme ohne Unterbrechung zu behalten.",
        graceNoticeNoDays:
          "Für den aktuellen bezahlten Zeitraum muss die Zahlung wiederhergestellt werden. Verlängern Sie den Tarif, um die kommerzielle Teilnahme am Anfragekanal zu behalten.",
        inactiveNotice:
          "Kommerzielle Teilnahme am Anfragekanal und öffentliche Sichtbarkeit sind derzeit nicht aktiv. Nach Zahlung von Professional oder Growth wird der Zugang wiederhergestellt.",
        planPicker: {
          title: "Verbindungsstufe wählen",
          subtitle:
            "Beide Tarife aktivieren die kommerzielle Teilnahme am Kundenanfrage-Kanal. Growth ergänzt eine erweiterte professionelle Seite und redaktionelle Aufbereitung.",
          professionalHint:
            "Kundenanfrage-Kanal, öffentliches Profil, eigenständige Verwaltung und bis zu 5 Galeriebilder.",
          growthHint:
            "Kundenanfrage-Kanal plus erweiterte professionelle Seite, redaktionelle Aufbereitung und bis zu 15 Bilder.",
        },
      },
      home: {
        incompleteBody:
          "Vervollständigen Sie die erforderlichen Angaben, um den Entwurf für Professional oder Growth vorzubereiten.",
        subscription: {
          grace: "Zahlungswiederherstellung bis",
          cta: "Kanal- und Tarifstatus",
          ctaChoosePlan: "Anfragekanal aktivieren",
          ctaPay: "Tarif verlängern",
          ctaUrgent: "Zahlung wiederherstellen",
        },
        statusHint: {
          approved: "Ihr Profil ist veröffentlicht und nimmt gemäß dem aktuellen Zugangsstatus an Freuly teil.",
        },
      },
      introBanner:
        "Vervollständigen Sie Profilangaben und Leistungen. Für neue Spezialisten werden öffentliche Sichtbarkeit und Kundenanfrage-Kanal nach Zahlung von Professional oder Growth aktiviert.",
      important: {
        title: "Wichtig",
        body:
          "Speichern Sie Änderungen zuerst. Die öffentliche Sichtbarkeit eines neuen Profils setzt aktives Professional oder Growth voraus.",
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

export function applyCommercialCopyOverridesV2(lang: CommercialLang, dictionary: Dict): Dict {
  return merge(dictionary, OVERRIDES[lang]);
}
