type CommercialLang = "ua" | "ru" | "de";
type Dict = Record<string, unknown>;

const FLAT: Record<CommercialLang, Record<string, string>> = {
  ru: {
    "dashboard.subscriptionPage.label.graceUntil": "Восстановление оплаты до",
    "dashboard.subscriptionPage.status.early_access": "Переходный доступ",
    "dashboard.subscriptionPage.status.trialing": "Переходный доступ",
    "dashboard.subscriptionPage.status.grace": "Восстановление оплаты",
    "dashboard.subscriptionPage.status.grace_period": "Восстановление оплаты",
    "dashboard.subscriptionPage.context.earlyAccess": "Для ранее подключённых специалистов может действовать индивидуальный переходный режим. Для новых специалистов подписка не обязательна: после публикации подходящие заявки можно покупать отдельно.",
    "dashboard.subscriptionPage.context.general": "Подписка Professional или Growth включает доступ к контактам подходящих заявок в рамках тарифа. Без подписки профиль может быть опубликован, а подходящие заявки можно покупать отдельно. Автоматического повторного списания нет.",
    "dashboard.billingPage.subtitle": "Здесь можно подключить Professional или Growth для доступа к заявкам в рамках тарифа. Без подписки подходящие заявки можно покупать отдельно; публикация базового профиля бесплатна.",
    "dashboard.billingPage.graceNotice": "Текущий оплаченный период требует восстановления оплаты до {{graceUntil}}. Продлите тариф, чтобы сохранить коммерческое участие в канале заявок без перерыва.",
    "dashboard.billingPage.graceNoticeNoDays": "Текущий оплаченный период требует восстановления оплаты. Продлите тариф, чтобы сохранить коммерческое участие в канале заявок.",
    "dashboard.billingPage.inactiveNotice": "Вы работаете без подписки. Подходящие заявки можно покупать отдельно. Подключите Professional или Growth, если хотите получать доступ к заявкам в рамках тарифа.",
    "dashboard.introBanner": "Заполните данные профиля и услуги. После публикации подходящие заявки можно покупать отдельно. Professional или Growth — подписка с доступом к заявкам в рамках тарифа, а не условие участия в канале.",
    "dashboard.important.body": "Сначала сохраните изменения. Публикация профиля не зависит от подписки Professional или Growth.",
    "dashboard.home.incompleteBody": "Заполните обязательные данные, чтобы опубликовать профиль. Подписка для публикации не требуется.",
    "dashboard.home.statusHint.approved": "Ваш профиль опубликован и участвует в работе Freuly согласно текущему статусу доступа.",
    "dashboard.home.subscription.grace": "Восстановление оплаты до",
    "dashboard.home.subscription.cta": "Статус канала и тарифа",
    "dashboard.home.subscription.ctaChoosePlan": "Выбрать тариф",
    "dashboard.home.subscription.ctaPay": "Продлить тариф",
    "dashboard.home.subscription.ctaUrgent": "Восстановить оплату",
    "dashboard.onboarding.welcome.title": "Настройте канал клиентских заявок",
    "dashboard.onboarding.welcome.body": "Расскажите, какие услуги вы оказываете, где и на каких языках работаете. Эти данные помогают Freuly сопоставлять вас с подходящими запросами клиентов.",
    "dashboard.onboarding.cta.start": "Начать настройку",
    "dashboard.onboarding.cta.continue": "Продолжить настройку",
    "dashboard.onboarding.ctaCard.title": "Продолжите настройку канала заявок",
    "dashboard.onboarding.ctaCard.body": "Заполните данные, которые нужны для подбора подходящих клиентских запросов. Пока профиль не опубликован, он остаётся черновиком.",
    "dashboard.onboarding.ctaCard.button": "Продолжить настройку",
    "dashboard.onboarding.ctaCard.readyTitle": "Черновик готов к публикации",
    "dashboard.onboarding.ctaCard.readyBody": "Обязательные данные заполнены. Публикация не требует подписки. Professional или Growth дают доступ к заявкам в рамках тарифа; без подписки подходящие заявки можно покупать отдельно.",
    "dashboard.onboarding.ctaCard.readyButton": "Перейти к тарифам",
    "dashboard.onboarding.stepContent.review.title": "Готовность к публикации",
    "dashboard.onboarding.stepContent.review.body": "Проверьте данные. Подписка не обязательна для участия в канале заявок.",
    "dashboard.onboarding.reviewStep.title": "Канал заявок почти готов",
    "dashboard.onboarding.reviewStep.body": "Проверьте обязательные пункты. После публикации подходящие заявки можно покупать отдельно или подключить доступ в рамках тарифа.",
    "dashboard.onboarding.reviewStep.readyTitle": "Параметры для подбора заявок настроены",
    "dashboard.onboarding.reviewStep.readyBody": "Все обязательные данные заполнены. Подписка Professional или Growth не обязательна — это способ получать доступ к заявкам в рамках тарифа.",
    "dashboard.onboarding.reviewStep.publish": "Завершить настройку",
    "dashboard.onboarding.reviewStep.publishing": "Проверяем готовность…",
    "dashboard.onboarding.reviewStep.viewProfile": "Перейти к тарифам",
    "dashboard.onboarding.steps.review": "Готовность",
    "dashboard.onboarding.publishReady": "Черновик готов к публикации. Подписка для публикации не требуется.",
    "dashboard.onboarding.publishNotReady": "Черновик пока не готов к публикации. Заполните оставшиеся обязательные данные.",
    "dashboard.onboarding.checklist.title": "Готовность к заявкам",
    "dashboard.readiness.title": "Что нужно для публикации",
    "dashboard.readiness.allReady": "Черновик готов к публикации",
  },
  ua: {
    "dashboard.subscriptionPage.label.graceUntil": "Відновлення оплати до",
    "dashboard.subscriptionPage.status.early_access": "Перехідний доступ",
    "dashboard.subscriptionPage.status.trialing": "Перехідний доступ",
    "dashboard.subscriptionPage.status.grace": "Відновлення оплати",
    "dashboard.subscriptionPage.status.grace_period": "Відновлення оплати",
    "dashboard.subscriptionPage.context.earlyAccess": "Для раніше підключених спеціалістів може діяти індивідуальний перехідний режим. Для нових спеціалістів підписка не обов’язкова: після публікації відповідні запити можна купувати окремо.",
    "dashboard.subscriptionPage.context.general": "Підписка Professional або Growth включає доступ до контактів відповідних запитів у межах тарифу. Без підписки профіль може бути опублікований, а відповідні запити можна купувати окремо. Автоматичного повторного списання немає.",
    "dashboard.billingPage.subtitle": "Тут можна підключити Professional або Growth для доступу до запитів у межах тарифу. Без підписки відповідні запити можна купувати окремо; публікація базового профілю безкоштовна.",
    "dashboard.billingPage.graceNotice": "Поточний оплачений період потребує відновлення оплати до {{graceUntil}}. Продовжте тариф, щоб зберегти комерційну участь у каналі запитів без перерви.",
    "dashboard.billingPage.graceNoticeNoDays": "Поточний оплачений період потребує відновлення оплати. Продовжте тариф, щоб зберегти комерційну участь у каналі запитів.",
    "dashboard.billingPage.inactiveNotice": "Ви працюєте без підписки. Відповідні запити можна купувати окремо. Підключіть Professional або Growth, якщо хочете отримувати доступ до запитів у межах тарифу.",
    "dashboard.introBanner": "Заповніть дані профілю та послуги. Після публікації відповідні запити можна купувати окремо. Professional або Growth — підписка з доступом до запитів у межах тарифу, а не умова участі в каналі.",
    "dashboard.important.body": "Спочатку збережіть зміни. Публікація профілю не залежить від підписки Professional або Growth.",
    "dashboard.home.incompleteBody": "Заповніть обов’язкові дані, щоб опублікувати профіль. Підписка для публікації не потрібна.",
    "dashboard.home.statusHint.approved": "Ваш профіль опубліковано й він бере участь у роботі Freuly відповідно до поточного статусу доступу.",
    "dashboard.home.subscription.grace": "Відновлення оплати до",
    "dashboard.home.subscription.cta": "Статус каналу і тарифу",
    "dashboard.home.subscription.ctaChoosePlan": "Обрати тариф",
    "dashboard.home.subscription.ctaPay": "Продовжити тариф",
    "dashboard.home.subscription.ctaUrgent": "Відновити оплату",
    "dashboard.onboarding.welcome.title": "Налаштуйте канал клієнтських запитів",
    "dashboard.onboarding.welcome.body": "Розкажіть, які послуги ви надаєте, де та якими мовами працюєте. Ці дані допомагають Freuly зіставляти вас із відповідними запитами клієнтів.",
    "dashboard.onboarding.cta.start": "Почати налаштування",
    "dashboard.onboarding.cta.continue": "Продовжити налаштування",
    "dashboard.onboarding.ctaCard.title": "Продовжте налаштування каналу запитів",
    "dashboard.onboarding.ctaCard.body": "Заповніть дані, потрібні для підбору відповідних клієнтських запитів. Поки профіль не опубліковано, він залишається чернеткою.",
    "dashboard.onboarding.ctaCard.button": "Продовжити налаштування",
    "dashboard.onboarding.ctaCard.readyTitle": "Чернетка готова до публікації",
    "dashboard.onboarding.ctaCard.readyBody": "Обов’язкові дані заповнено. Публікація не потребує підписки. Professional або Growth дають доступ до запитів у межах тарифу; без підписки відповідні запити можна купувати окремо.",
    "dashboard.onboarding.ctaCard.readyButton": "Перейти до тарифів",
    "dashboard.onboarding.stepContent.review.title": "Готовність до публікації",
    "dashboard.onboarding.stepContent.review.body": "Перевірте дані. Підписка не обов’язкова для участі в каналі запитів.",
    "dashboard.onboarding.reviewStep.title": "Канал запитів майже готовий",
    "dashboard.onboarding.reviewStep.body": "Перевірте обов’язкові пункти. Після публікації відповідні запити можна купувати окремо або підключити доступ у межах тарифу.",
    "dashboard.onboarding.reviewStep.readyTitle": "Параметри для підбору запитів налаштовані",
    "dashboard.onboarding.reviewStep.readyBody": "Усі обов’язкові дані заповнено. Підписка Professional або Growth не обов’язкова — це спосіб отримувати доступ до запитів у межах тарифу.",
    "dashboard.onboarding.reviewStep.publish": "Завершити налаштування",
    "dashboard.onboarding.reviewStep.publishing": "Перевіряємо готовність…",
    "dashboard.onboarding.reviewStep.viewProfile": "Перейти до тарифів",
    "dashboard.onboarding.steps.review": "Готовність",
    "dashboard.onboarding.publishReady": "Чернетка готова до публікації. Підписка для публікації не потрібна.",
    "dashboard.onboarding.publishNotReady": "Чернетка поки не готова до публікації. Заповніть решту обов’язкових даних.",
    "dashboard.onboarding.checklist.title": "Готовність до запитів",
    "dashboard.readiness.title": "Що потрібно для публікації",
    "dashboard.readiness.allReady": "Чернетка готова до публікації",
  },
  de: {
    "dashboard.subscriptionPage.label.graceUntil": "Zahlungswiederherstellung bis",
    "dashboard.subscriptionPage.status.early_access": "Übergangszugang",
    "dashboard.subscriptionPage.status.trialing": "Übergangszugang",
    "dashboard.subscriptionPage.status.grace": "Zahlungswiederherstellung",
    "dashboard.subscriptionPage.status.grace_period": "Zahlungswiederherstellung",
    "dashboard.subscriptionPage.context.earlyAccess": "Für bereits früher verbundene Spezialisten kann ein individueller Übergangsmodus gelten. Für neue Spezialisten ist kein Abo erforderlich: nach der Veröffentlichung können passende Anfragen einzeln gekauft werden.",
    "dashboard.subscriptionPage.context.general": "Professional oder Growth enthalten den Zugang zu Kontakten passender Anfragen im Rahmen des Tarifs. Ohne Abo kann das Profil veröffentlicht werden, und passende Anfragen können einzeln gekauft werden. Es gibt keine automatische wiederkehrende Abbuchung.",
    "dashboard.billingPage.subtitle": "Hier können Sie Professional oder Growth für Anfragezugang im Tarif aktivieren. Ohne Abo können passende Anfragen einzeln gekauft werden; die Veröffentlichung des Basisprofils ist kostenlos.",
    "dashboard.billingPage.graceNotice": "Für den aktuellen bezahlten Zeitraum muss die Zahlung bis {{graceUntil}} wiederhergestellt werden. Verlängern Sie den Tarif, um die kommerzielle Teilnahme ohne Unterbrechung zu behalten.",
    "dashboard.billingPage.graceNoticeNoDays": "Für den aktuellen bezahlten Zeitraum muss die Zahlung wiederhergestellt werden. Verlängern Sie den Tarif, um die kommerzielle Teilnahme am Anfragekanal zu behalten.",
    "dashboard.billingPage.inactiveNotice": "Sie arbeiten ohne Abo. Passende Anfragen können einzeln gekauft werden. Aktivieren Sie Professional oder Growth, wenn Sie Zugang zu Anfragen im Rahmen des Tarifs erhalten möchten.",
    "dashboard.introBanner": "Vervollständigen Sie Profilangaben und Leistungen. Nach der Veröffentlichung können passende Anfragen einzeln gekauft werden. Professional oder Growth sind ein Abo mit Zugang zu Anfragen im Rahmen des Tarifs, keine Voraussetzung für die Teilnahme am Kanal.",
    "dashboard.important.body": "Speichern Sie Änderungen zuerst. Die Veröffentlichung des Profils hängt nicht von einem Professional- oder Growth-Abo ab.",
    "dashboard.home.incompleteBody": "Vervollständigen Sie die erforderlichen Angaben, um das Profil zu veröffentlichen. Ein Abo ist dafür nicht erforderlich.",
    "dashboard.home.statusHint.approved": "Ihr Profil ist veröffentlicht und nimmt gemäß dem aktuellen Zugangsstatus an Freuly teil.",
    "dashboard.home.subscription.grace": "Zahlungswiederherstellung bis",
    "dashboard.home.subscription.cta": "Kanal- und Tarifstatus",
    "dashboard.home.subscription.ctaChoosePlan": "Tarif wählen",
    "dashboard.home.subscription.ctaPay": "Tarif verlängern",
    "dashboard.home.subscription.ctaUrgent": "Zahlung wiederherstellen",
    "dashboard.onboarding.welcome.title": "Richten Sie Ihren Kundenanfrage-Kanal ein",
    "dashboard.onboarding.welcome.body": "Geben Sie an, welche Leistungen Sie anbieten, wo und in welchen Sprachen Sie arbeiten. Diese Daten helfen Freuly, Sie passenden Kundenanfragen zuzuordnen.",
    "dashboard.onboarding.cta.start": "Einrichtung starten",
    "dashboard.onboarding.cta.continue": "Einrichtung fortsetzen",
    "dashboard.onboarding.ctaCard.title": "Einrichtung des Anfragekanals fortsetzen",
    "dashboard.onboarding.ctaCard.body": "Vervollständigen Sie die Angaben für die Zuordnung passender Kundenanfragen. Solange das Profil nicht veröffentlicht ist, bleibt es ein Entwurf.",
    "dashboard.onboarding.ctaCard.button": "Einrichtung fortsetzen",
    "dashboard.onboarding.ctaCard.readyTitle": "Entwurf bereit zur Veröffentlichung",
    "dashboard.onboarding.ctaCard.readyBody": "Die Pflichtangaben sind vollständig. Die Veröffentlichung erfordert kein Abo. Professional oder Growth geben Zugang zu Anfragen im Rahmen des Tarifs; ohne Abo können passende Anfragen einzeln gekauft werden.",
    "dashboard.onboarding.ctaCard.readyButton": "Zu den Tarifen",
    "dashboard.onboarding.stepContent.review.title": "Bereit zur Veröffentlichung",
    "dashboard.onboarding.stepContent.review.body": "Prüfen Sie Ihre Angaben. Ein Abo ist keine Voraussetzung für die Teilnahme am Anfragekanal.",
    "dashboard.onboarding.reviewStep.title": "Ihr Anfragekanal ist fast bereit",
    "dashboard.onboarding.reviewStep.body": "Prüfen Sie die Pflichtangaben. Nach der Veröffentlichung können passende Anfragen einzeln gekauft oder im Rahmen des Tarifs freigeschaltet werden.",
    "dashboard.onboarding.reviewStep.readyTitle": "Parameter für die Anfragezuordnung sind eingerichtet",
    "dashboard.onboarding.reviewStep.readyBody": "Alle Pflichtangaben sind vollständig. Professional oder Growth sind optional — so erhalten Sie Zugang zu Anfragen im Rahmen des Tarifs.",
    "dashboard.onboarding.reviewStep.publish": "Einrichtung abschließen",
    "dashboard.onboarding.reviewStep.publishing": "Bereitschaft wird geprüft…",
    "dashboard.onboarding.reviewStep.viewProfile": "Zu den Tarifen",
    "dashboard.onboarding.steps.review": "Bereitschaft",
    "dashboard.onboarding.publishReady": "Der Entwurf ist zur Veröffentlichung bereit. Ein Abo ist dafür nicht erforderlich.",
    "dashboard.onboarding.publishNotReady": "Der Entwurf ist noch nicht bereit. Vervollständigen Sie die fehlenden Pflichtangaben.",
    "dashboard.onboarding.checklist.title": "Bereitschaft für Anfragen",
    "dashboard.readiness.title": "Was für die Veröffentlichung fehlt",
    "dashboard.readiness.allReady": "Entwurf bereit zur Veröffentlichung",
  },
};

const SPECIALIST_RULES: Record<CommercialLang, Dict> = {
  ru: {
    title: "Правила для специалистов Freuly",
    intro: "Чтобы Freuly оставался полезным и вызывал доверие, специалисты обязаны поддерживать достоверный профиль, соблюдать требования к услугам и добросовестно работать с клиентскими запросами.",
    closing: "Регистрируясь и принимая Правила Freuly, специалист подтверждает, что понимает и будет их соблюдать. Публичная публикация нового профиля осуществляется по действующим условиям тарифа и публикации.",
  },
  ua: {
    title: "Правила для спеціалістів Freuly",
    intro: "Щоб Freuly залишався корисним і викликав довіру, спеціалісти мають підтримувати достовірний профіль, дотримуватися вимог до послуг і добросовісно працювати з клієнтськими запитами.",
    closing: "Реєструючись і приймаючи Правила Freuly, спеціаліст підтверджує, що розуміє та дотримуватиметься їх. Публічна публікація нового профілю здійснюється за чинними умовами тарифу та публікації.",
  },
  de: {
    title: "Regeln für Spezialisten bei Freuly",
    intro: "Damit Freuly nützlich und vertrauenswürdig bleibt, müssen Spezialisten korrekte Profildaten pflegen, die Anforderungen an Leistungen einhalten und verantwortungsvoll mit Kundenanfragen arbeiten.",
    closing: "Mit der Registrierung und Annahme der Freuly-Regeln bestätigt der Spezialist, dass er sie versteht und einhalten wird. Die öffentliche Veröffentlichung eines neuen Profils erfolgt nach den jeweils geltenden Tarif- und Veröffentlichungsbedingungen.",
  },
};

const PARTNER: Record<CommercialLang, Dict> = {
  ru: {
    public: {
      subtitle:
        "Специалист регистрируется и публикует базовый профиль бесплатно. Если привлечённый вами новый специалист позже впервые подключит платный месячный Professional или Growth, вы получите одноразовое вознаграждение.",
      howSteps:
        "Зарегистрируйтесь или войдите и примите Условия партнёрской программы.|Получите персональную referral-ссылку и делитесь ею с вашей аудиторией.|Новый специалист регистрируется по ссылке и может бесплатно опубликовать базовый профиль.|Если этот специалист впервые активирует платный месячный Professional или Growth, возникает партнёрское вознаграждение.|Вознаграждение 14 дней находится в статусе pending, затем подтверждается при выполнении условий.|После подтверждения доступна денежная выплата или Freuly-кредит по правилам программы.",
      rewardBody:
        "Вознаграждение начисляется один раз с первой квалифицирующей оплаты месячного Professional или Growth привлечённым специалистом и рассчитывается из фактически полученной Freuly суммы после применимого НДС и фактической комиссии платёжного провайдера.",
      rewardNote:
        "Бесплатная регистрация и публикация профиля сами по себе не создают вознаграждение. Разовая покупка отдельной клиентской заявки также не считается квалифицирующей оплатой партнёрской программы.",
    },
    faq: {
      a3:
        "За первую успешную квалифицирующую оплату месячного Professional или Growth новым специалистом по вашей referral-ссылке — после 14-дневной проверки. Бесплатная публикация профиля и разовые покупки заявок вознаграждение не создают.",
    },
  },
  ua: {
    public: {
      subtitle:
        "Спеціаліст реєструється та публікує базовий профіль безкоштовно. Якщо залучений вами новий спеціаліст пізніше вперше підключить платний місячний Professional або Growth, ви отримаєте одноразову винагороду.",
      howSteps:
        "Зареєструйтеся або увійдіть і прийміть Умови партнерської програми.|Отримайте персональне referral-посилання та діліться ним зі своєю аудиторією.|Новий спеціаліст реєструється за посиланням і може безкоштовно опублікувати базовий профіль.|Якщо цей спеціаліст уперше активує платний місячний Professional або Growth, виникає партнерська винагорода.|Винагорода 14 днів перебуває у статусі pending, потім підтверджується за виконання умов.|Після підтвердження доступна грошова виплата або Freuly-кредит за правилами програми.",
      rewardBody:
        "Винагорода нараховується один раз із першої кваліфікуючої оплати місячного Professional або Growth залученим спеціалістом і розраховується з фактично отриманої Freuly суми після застосовного ПДВ та фактичної комісії платіжного провайдера.",
      rewardNote:
        "Безкоштовна реєстрація та публікація профілю самі по собі не створюють винагороду. Разова купівля окремого клієнтського запиту також не вважається кваліфікуючою оплатою партнерської програми.",
    },
    faq: {
      a3:
        "За першу успішну кваліфікуючу оплату місячного Professional або Growth новим спеціалістом за вашим referral-посиланням — після 14-денної перевірки. Безкоштовна публікація профілю та разові покупки запитів винагороду не створюють.",
    },
  },
  de: {
    public: {
      subtitle:
        "Der Spezialist registriert sich und veröffentlicht sein Basisprofil kostenlos. Aktiviert ein von Ihnen vermittelter neuer Spezialist später erstmals einen bezahlten monatlichen Professional- oder Growth-Tarif, erhalten Sie eine einmalige Vergütung.",
      howSteps:
        "Registrieren oder anmelden und die Partnerprogramm-Bedingungen akzeptieren.|Persönlichen Referral-Link erhalten und mit Ihrer Zielgruppe teilen.|Ein neuer Spezialist registriert sich über den Link und kann sein Basisprofil kostenlos veröffentlichen.|Aktiviert dieser Spezialist erstmals einen bezahlten monatlichen Professional- oder Growth-Tarif, entsteht die Partnervergütung.|Die Vergütung bleibt 14 Tage pending und wird danach bei erfüllten Bedingungen bestätigt.|Danach ist eine Auszahlung oder Freuly-Guthaben nach den Programmregeln möglich.",
      rewardBody:
        "Die Vergütung entsteht einmalig aus der ersten qualifizierenden monatlichen Zahlung für Professional oder Growth des vermittelten Spezialisten und wird aus dem von Freuly tatsächlich erhaltenen Betrag nach anwendbarer Umsatzsteuer und tatsächlicher Zahlungsgebühr berechnet.",
      rewardNote:
        "Kostenlose Registrierung und Profilveröffentlichung allein erzeugen keine Vergütung. Auch der einmalige Kauf einer einzelnen Kundenanfrage gilt nicht als qualifizierende Partnerzahlung.",
    },
    faq: {
      a3:
        "Für die erste erfolgreiche qualifizierende monatliche Zahlung für Professional oder Growth eines neuen Spezialisten über Ihren Referral-Link — nach 14-tägiger Prüfung. Kostenlose Profilveröffentlichung und einzelne Anfragekäufe lösen keine Vergütung aus.",
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

export function applyCommercialFinalOverrides(lang: CommercialLang, dictionary: Dict): Dict {
  const withFlat = { ...dictionary, ...FLAT[lang] };
  return merge(withFlat, {
    specialistRules: SPECIALIST_RULES[lang],
    partner: PARTNER[lang],
  });
}
