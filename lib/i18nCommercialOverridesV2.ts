type CommercialLang = "ua" | "ru" | "de";
type Dict = Record<string, unknown>;

const OVERRIDES: Record<CommercialLang, Dict> = {
  ru: {
    application: {
      pricingNote:
        "Регистрация и подготовка черновика не требуют оплаты. После публикации подходящие заявки можно покупать отдельно. Professional или Growth включают доступ к заявкам в рамках тарифа и не являются условием участия в канале.",
    },
    pricing: {
      compare: {
        rows: [
          { label: "Канал клиентских заявок", professional: "Да", growth: "Да" },
          { label: "Публичный профиль", professional: "Да, бесплатно", growth: "Да, бесплатно" },
          { label: "Услуги и цены", professional: "Да", growth: "Да" },
          { label: "Фотографии в галерее", professional: "До 5", growth: "До 15" },
          { label: "Языки, формат работы и география", professional: "Да", growth: "Да" },
          { label: "Категории и поиск Freuly", professional: "Да", growth: "Да" },
          { label: "Уведомления о подходящих заявках", professional: "Да", growth: "Да" },
          { label: "Самостоятельное редактирование", professional: "Да", growth: "Да" },
          { label: "Расширенная Pro Page", professional: "—", growth: "Да" },
          { label: "Дополнительные смысловые блоки", professional: "—", growth: "Да" },
          { label: "Расширенная визуальная подача", professional: "—", growth: "Да" },
          { label: "Заполнение профиля нашей командой", professional: "+30 €", growth: "+30 €" },
          { label: "Профессиональная упаковка продукта", professional: "+149 €", growth: "+149 €" },
        ],
      },
    },
    dashboard: {
      billingPage: {
        title: "Оплата и тарифы",
        subtitle:
          "Здесь вы можете выбрать Professional или Growth, если хотите получать доступ к заявкам в рамках тарифа. Без подписки подходящие заявки можно покупать отдельно.",
        graceNotice:
          "Текущий оплаченный период требует восстановления оплаты до {{graceUntil}}. Продлите тариф, чтобы сохранить коммерческое участие в канале заявок без перерыва.",
        graceNoticeNoDays:
          "Текущий оплаченный период требует восстановления оплаты. Продлите тариф, чтобы сохранить коммерческое участие в канале заявок.",
        inactiveNotice:
          "Вы работаете без подписки. Подходящие заявки можно покупать отдельно. Подключите Professional или Growth, если хотите получать доступ к заявкам в рамках тарифа.",
        planPicker: {
          title: "Выберите уровень подключения",
          subtitle:
            "Оба тарифа включают доступ к контактам подходящих заявок в рамках подписки. Growth дополнительно включает расширенную Pro Page. Ручная упаковка предложения оплачивается отдельно.",
          professionalHint:
            "Канал клиентских заявок, публичный профиль, самостоятельное ведение и до 5 фото в галерее.",
          growthHint:
            "Канал клиентских заявок плюс расширенная Pro Page и до 15 фото. Профессиональная упаковка продукта доступна отдельно.",
        },
      },
      home: {
        incompleteBody:
          "Заполните обязательные данные, чтобы опубликовать профиль. Подписка для публикации не требуется.",
        subscription: {
          grace: "Восстановление оплаты до",
          cta: "Статус канала и тарифа",
          ctaChoosePlan: "Выбрать тариф",
          ctaPay: "Продлить тариф",
          ctaUrgent: "Восстановить оплату",
        },
        statusHint: {
          approved: "Ваш профиль опубликован и участвует в работе Freuly согласно текущему статусу доступа.",
        },
      },
      introBanner:
        "Заполните данные профиля и услуги. После публикации подходящие заявки можно покупать отдельно. Professional или Growth — подписка с доступом к заявкам в рамках тарифа, а не условие участия в канале.",
      important: {
        title: "Важно",
        body:
          "Сначала сохраните изменения. Публикация профиля не зависит от подписки Professional или Growth.",
      },
    },
  },
  ua: {
    application: {
      pricingNote:
        "Реєстрація та підготовка чернетки не потребують оплати. Після публікації відповідні запити можна купувати окремо. Professional або Growth включають доступ до запитів у межах тарифу і не є умовою участі в каналі.",
    },
    pricing: {
      compare: {
        rows: [
          { label: "Канал клієнтських запитів", professional: "Так", growth: "Так" },
          { label: "Публічний профіль", professional: "Так, безкоштовно", growth: "Так, безкоштовно" },
          { label: "Послуги та ціни", professional: "Так", growth: "Так" },
          { label: "Фотографії в галереї", professional: "До 5", growth: "До 15" },
          { label: "Мови, формат роботи та географія", professional: "Так", growth: "Так" },
          { label: "Категорії та пошук Freuly", professional: "Так", growth: "Так" },
          { label: "Сповіщення про відповідні запити", professional: "Так", growth: "Так" },
          { label: "Самостійне редагування", professional: "Так", growth: "Так" },
          { label: "Розширена Pro Page", professional: "—", growth: "Так" },
          { label: "Додаткові змістові блоки", professional: "—", growth: "Так" },
          { label: "Розширена візуальна подача", professional: "—", growth: "Так" },
          { label: "Заповнення профілю нашою командою", professional: "+30 €", growth: "+30 €" },
          { label: "Професійне оформлення продукту", professional: "+149 €", growth: "+149 €" },
        ],
      },
    },
    dashboard: {
      billingPage: {
        title: "Оплата та тарифи",
        subtitle:
          "Тут ви можете вибрати Professional або Growth, якщо хочете отримувати доступ до запитів у межах тарифу. Без підписки відповідні запити можна купувати окремо.",
        graceNotice:
          "Поточний оплачений період потребує відновлення оплати до {{graceUntil}}. Продовжте тариф, щоб зберегти комерційну участь у каналі запитів без перерви.",
        graceNoticeNoDays:
          "Поточний оплачений період потребує відновлення оплати. Продовжте тариф, щоб зберегти комерційну участь у каналі запитів.",
        inactiveNotice:
          "Ви працюєте без підписки. Відповідні запити можна купувати окремо. Підключіть Professional або Growth, якщо хочете отримувати доступ до запитів у межах тарифу.",
        planPicker: {
          title: "Оберіть рівень підключення",
          subtitle:
            "Обидва тарифи включають доступ до контактів відповідних запитів у межах підписки. Growth додатково включає розширену Pro Page. Ручне оформлення пропозиції оплачується окремо.",
          professionalHint:
            "Канал клієнтських запитів, публічний профіль, самостійне ведення та до 5 фото в галереї.",
          growthHint:
            "Канал клієнтських запитів плюс розширена Pro Page та до 15 фото. Професійне оформлення продукту доступне окремо.",
        },
      },
      home: {
        incompleteBody:
          "Заповніть обов’язкові дані, щоб опублікувати профіль. Підписка для публікації не потрібна.",
        subscription: {
          grace: "Відновлення оплати до",
          cta: "Статус каналу і тарифу",
          ctaChoosePlan: "Обрати тариф",
          ctaPay: "Продовжити тариф",
          ctaUrgent: "Відновити оплату",
        },
        statusHint: {
          approved: "Ваш профіль опубліковано й він бере участь у роботі Freuly відповідно до поточного статусу доступу.",
        },
      },
      introBanner:
        "Заповніть дані профілю та послуги. Після публікації відповідні запити можна купувати окремо. Professional або Growth — підписка з доступом до запитів у межах тарифу, а не умова участі в каналі.",
      important: {
        title: "Важливо",
        body:
          "Спочатку збережіть зміни. Публікація профілю не залежить від підписки Professional або Growth.",
      },
    },
  },
  de: {
    application: {
      pricingNote:
        "Registrierung und Vorbereitung des Entwurfs sind ohne Tarifzahlung möglich. Nach der Veröffentlichung können passende Anfragen einzeln gekauft werden. Professional oder Growth enthalten den Zugang zu Anfragen im Rahmen des Tarifs und sind keine Voraussetzung für die Teilnahme am Anfragekanal.",
    },
    pricing: {
      compare: {
        rows: [
          { label: "Kundenanfrage-Kanal", professional: "Ja", growth: "Ja" },
          { label: "Öffentliches Profil", professional: "Ja, kostenlos", growth: "Ja, kostenlos" },
          { label: "Leistungen und Preise", professional: "Ja", growth: "Ja" },
          { label: "Galeriebilder", professional: "Bis 5", growth: "Bis 15" },
          { label: "Sprachen, Arbeitsformat und Geografie", professional: "Ja", growth: "Ja" },
          { label: "Kategorien und Freuly-Suche", professional: "Ja", growth: "Ja" },
          { label: "Benachrichtigungen zu passenden Anfragen", professional: "Ja", growth: "Ja" },
          { label: "Eigenständige Bearbeitung", professional: "Ja", growth: "Ja" },
          { label: "Erweiterte Pro Page", professional: "—", growth: "Ja" },
          { label: "Zusätzliche Inhaltsblöcke", professional: "—", growth: "Ja" },
          { label: "Erweiterte visuelle Präsentation", professional: "—", growth: "Ja" },
          { label: "Profilbefüllung durch unser Team", professional: "+30 €", growth: "+30 €" },
          { label: "Professionelle Produktaufbereitung", professional: "+149 €", growth: "+149 €" },
        ],
      },
    },
    dashboard: {
      billingPage: {
        title: "Zahlung und Tarife",
        subtitle:
          "Wählen Sie Professional oder Growth, wenn Sie Zugang zu Anfragen im Rahmen des Tarifs erhalten möchten. Ohne Abo können passende Anfragen einzeln gekauft werden.",
        graceNotice:
          "Für den aktuellen bezahlten Zeitraum muss die Zahlung bis {{graceUntil}} wiederhergestellt werden. Verlängern Sie den Tarif, um die kommerzielle Teilnahme ohne Unterbrechung zu behalten.",
        graceNoticeNoDays:
          "Für den aktuellen bezahlten Zeitraum muss die Zahlung wiederhergestellt werden. Verlängern Sie den Tarif, um die kommerzielle Teilnahme am Anfragekanal zu behalten.",
        inactiveNotice:
          "Sie arbeiten ohne Abo. Passende Anfragen können einzeln gekauft werden. Aktivieren Sie Professional oder Growth, wenn Sie Zugang zu Anfragen im Rahmen des Tarifs erhalten möchten.",
        planPicker: {
          title: "Verbindungsstufe wählen",
          subtitle:
            "Beide Tarife enthalten den Zugang zu Kontakten passender Anfragen im Rahmen des Abos. Growth ergänzt eine erweiterte Pro Page. Manuelle Angebotsaufbereitung wird separat berechnet.",
          professionalHint:
            "Kundenanfrage-Kanal, öffentliches Profil, eigenständige Verwaltung und bis zu 5 Galeriebilder.",
          growthHint:
            "Kundenanfrage-Kanal plus erweiterte Pro Page und bis zu 15 Bilder. Professionelle Produktaufbereitung ist separat verfügbar.",
        },
      },
      home: {
        incompleteBody:
          "Vervollständigen Sie die erforderlichen Angaben, um das Profil zu veröffentlichen. Ein Abo ist dafür nicht erforderlich.",
        subscription: {
          grace: "Zahlungswiederherstellung bis",
          cta: "Kanal- und Tarifstatus",
          ctaChoosePlan: "Tarif wählen",
          ctaPay: "Tarif verlängern",
          ctaUrgent: "Zahlung wiederherstellen",
        },
        statusHint: {
          approved: "Ihr Profil ist veröffentlicht und nimmt gemäß dem aktuellen Zugangsstatus an Freuly teil.",
        },
      },
      introBanner:
        "Vervollständigen Sie Profilangaben und Leistungen. Nach der Veröffentlichung können passende Anfragen einzeln gekauft werden. Professional oder Growth sind ein Abo mit Zugang zu Anfragen im Rahmen des Tarifs, keine Voraussetzung für die Teilnahme am Kanal.",
      important: {
        title: "Wichtig",
        body:
          "Speichern Sie Änderungen zuerst. Die Veröffentlichung des Profils hängt nicht von einem Professional- oder Growth-Abo ab.",
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
