"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { publicCardClass, publicFieldClass, publicLinkSecondaryClass } from "@/components/public/publicStyles";
import type { Lang } from "@/lib/i18n";
import { privacyPath } from "@/lib/legal/paths";
import type { ServiceIntentLocale, ServiceIntentQuestion } from "@/lib/serviceIntent/contract";
import {
  acceptExtraction,
  applyClarificationAnswer,
  buildConfirmedServiceRequest,
  buildInitialExtractBody,
  canStartIntake,
  integrateClarificationResult,
  reviewEditsFromDraft,
  reviewTiming,
  timingLabel,
  type ClarificationAnswer,
  type ExtractBody,
  type IntakeDraft,
  type ReviewEdits,
} from "@/lib/serviceIntent/intake";

type Copy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  taskLabel: string;
  taskPlaceholder: string;
  continue: string;
  extracting: string;
  questionHint: string;
  noPreference: string;
  answerPlaceholder: string;
  what: string;
  where: string;
  format: string;
  language: string;
  when: string;
  additional: string;
  online: string;
  offline: string;
  either: string;
  languages: Record<ServiceIntentLocale, string>;
  timingAsap: string;
  timingWeek: string;
  timingMonth: string;
  timingFlexible: string;
  contactTitle: string;
  nameLabel: string;
  emailLabel: string;
  phoneLabel: string;
  contactHint: string;
  licensedNote: string;
  reviewNote: string;
  submit: string;
  submitting: string;
  back: string;
  retry: string;
  aiFailed: string;
  submitFailed: string;
  blockedTitle: string;
  blockedBody: string;
  offerTitle: string;
  offerBody: string;
  requiredTask: string;
  requiredFormat: string;
  requiredLocation: string;
  requiredName: string;
  requiredContact: string;
  successTitle: string;
  successBody: string;
  successId: string;
  explore: string;
  privacyBefore: string;
  privacyLink: string;
  privacyAfter: string;
};

const COPY: Record<Lang, Copy> = {
  ru: {
    eyebrow: "Опишите задачу своими словами",
    title: "Что вам нужно?",
    subtitle: "Напишите как есть. Мы спросим только то, чего действительно не хватает.",
    taskLabel: "Ваша задача",
    taskPlaceholder: "Например: нужен русскоязычный гинеколог в Гамбурге на следующей неделе",
    continue: "Продолжить",
    extracting: "Разбираем задачу…",
    questionHint: "Один вопрос, чтобы ничего не упустить.",
    noPreference: "Неважно",
    answerPlaceholder: "Ваш ответ",
    what: "Что нужно",
    where: "Где",
    format: "Формат",
    language: "Язык",
    when: "Когда",
    additional: "Дополнительно",
    online: "Онлайн",
    offline: "Лично",
    either: "Неважно",
    languages: { ru: "Русский", ua: "Українська", de: "Deutsch" },
    timingAsap: "Как можно скорее",
    timingWeek: "На следующей неделе",
    timingMonth: "В следующем месяце",
    timingFlexible: "Срок гибкий",
    contactTitle: "Куда сообщить результат?",
    nameLabel: "Как к вам обращаться?",
    emailLabel: "Email",
    phoneLabel: "Телефон",
    contactHint: "Достаточно одного контакта: email или телефона.",
    licensedNote: "Для этой услуги может понадобиться проверенный специалист. Заявка будет рассмотрена.",
    reviewNote: "Мы посмотрим заявку перед тем, как передавать её специалистам.",
    submit: "Отправить заявку",
    submitting: "Отправляем…",
    back: "Изменить текст",
    retry: "Попробовать ещё раз",
    aiFailed: "Не удалось разобрать задачу. Текст сохранён, попробуйте ещё раз.",
    submitFailed: "Не удалось отправить заявку. Попробуйте ещё раз.",
    blockedTitle: "Такую заявку нельзя отправить",
    blockedBody: "Этот запрос не подходит для Freuly. Измените текст, если имели в виду другую услугу.",
    offerTitle: "Это форма для поиска специалиста",
    offerBody: "Если вы сами оказываете услугу, расскажите, что вам нужно найти, или измените текст.",
    requiredTask: "Опишите задачу хотя бы одним предложением.",
    requiredFormat: "Выберите формат.",
    requiredLocation: "Укажите город.",
    requiredName: "Укажите, как к вам обращаться.",
    requiredContact: "Укажите email или телефон.",
    successTitle: "Заявка отправлена",
    successBody: "Мы получили ваш запрос.",
    successId: "Номер заявки",
    explore: "Перейти на Freuly",
    privacyBefore: "Отправляя заявку, вы соглашаетесь с обработкой данных согласно ",
    privacyLink: "политике конфиденциальности",
    privacyAfter: ".",
  },
  ua: {
    eyebrow: "Опишіть завдання своїми словами",
    title: "Що вам потрібно?",
    subtitle: "Напишіть як є. Ми запитаємо лише те, чого справді бракує.",
    taskLabel: "Ваше завдання",
    taskPlaceholder: "Наприклад: потрібен російськомовний гінеколог у Гамбурзі наступного тижня",
    continue: "Продовжити",
    extracting: "Розбираємо завдання…",
    questionHint: "Одне запитання, щоб нічого не пропустити.",
    noPreference: "Неважливо",
    answerPlaceholder: "Ваша відповідь",
    what: "Що потрібно",
    where: "Де",
    format: "Формат",
    language: "Мова",
    when: "Коли",
    additional: "Додатково",
    online: "Онлайн",
    offline: "Особисто",
    either: "Неважливо",
    languages: { ru: "Русский", ua: "Українська", de: "Deutsch" },
    timingAsap: "Якомога швидше",
    timingWeek: "Наступного тижня",
    timingMonth: "Наступного місяця",
    timingFlexible: "Строк гнучкий",
    contactTitle: "Куди повідомити результат?",
    nameLabel: "Як до вас звертатися?",
    emailLabel: "Email",
    phoneLabel: "Телефон",
    contactHint: "Достатньо одного контакту: email або телефону.",
    licensedNote: "Для цієї послуги може знадобитися перевірений спеціаліст. Заявку буде розглянуто.",
    reviewNote: "Ми переглянемо заявку перед тим, як передавати її спеціалістам.",
    submit: "Надіслати заявку",
    submitting: "Надсилаємо…",
    back: "Змінити текст",
    retry: "Спробувати ще раз",
    aiFailed: "Не вдалося розібрати завдання. Текст збережено, спробуйте ще раз.",
    submitFailed: "Не вдалося надіслати заявку. Спробуйте ще раз.",
    blockedTitle: "Таку заявку не можна надіслати",
    blockedBody: "Цей запит не підходить для Freuly. Змініть текст, якщо мали на увазі іншу послугу.",
    offerTitle: "Це форма для пошуку спеціаліста",
    offerBody: "Якщо ви самі надаєте послугу, опишіть, що вам потрібно знайти, або змініть текст.",
    requiredTask: "Опишіть завдання хоча б одним реченням.",
    requiredFormat: "Оберіть формат.",
    requiredLocation: "Вкажіть місто.",
    requiredName: "Вкажіть, як до вас звертатися.",
    requiredContact: "Вкажіть email або телефон.",
    successTitle: "Заявку надіслано",
    successBody: "Ми отримали ваш запит.",
    successId: "Номер заявки",
    explore: "Перейти на Freuly",
    privacyBefore: "Надсилаючи заявку, ви погоджуєтесь з обробкою даних відповідно до ",
    privacyLink: "політики конфіденційності",
    privacyAfter: ".",
  },
  de: {
    eyebrow: "Beschreiben Sie Ihre Aufgabe in eigenen Worten",
    title: "Was brauchen Sie?",
    subtitle: "Schreiben Sie es so, wie es ist. Wir fragen nur, was wirklich fehlt.",
    taskLabel: "Ihre Aufgabe",
    taskPlaceholder: "Zum Beispiel: russischsprachige Gynäkologin in Hamburg nächste Woche",
    continue: "Weiter",
    extracting: "Wir lesen die Aufgabe…",
    questionHint: "Eine Frage, damit nichts fehlt.",
    noPreference: "Egal",
    answerPlaceholder: "Ihre Antwort",
    what: "Was",
    where: "Wo",
    format: "Form",
    language: "Sprache",
    when: "Wann",
    additional: "Zusätzlich",
    online: "Online",
    offline: "Vor Ort",
    either: "Egal",
    languages: { ru: "Russisch", ua: "Ukrainisch", de: "Deutsch" },
    timingAsap: "So schnell wie möglich",
    timingWeek: "Nächste Woche",
    timingMonth: "Nächsten Monat",
    timingFlexible: "Flexibel",
    contactTitle: "Wohin dürfen wir das Ergebnis senden?",
    nameLabel: "Wie dürfen wir Sie ansprechen?",
    emailLabel: "E-Mail",
    phoneLabel: "Telefon",
    contactHint: "Ein Kontakt reicht: E-Mail oder Telefonnummer.",
    licensedNote: "Für diese Leistung kann eine geprüfte Fachkraft nötig sein. Die Anfrage wird geprüft.",
    reviewNote: "Wir prüfen die Anfrage, bevor wir sie an Fachkräfte weitergeben.",
    submit: "Anfrage senden",
    submitting: "Wird gesendet…",
    back: "Text ändern",
    retry: "Erneut versuchen",
    aiFailed: "Die Aufgabe konnte nicht gelesen werden. Der Text bleibt erhalten.",
    submitFailed: "Die Anfrage konnte nicht gesendet werden. Bitte erneut versuchen.",
    blockedTitle: "Diese Anfrage kann nicht gesendet werden",
    blockedBody: "Diese Anfrage passt nicht zu Freuly. Ändern Sie den Text, wenn Sie etwas anderes meinten.",
    offerTitle: "Dieses Formular sucht eine Fachkraft",
    offerBody: "Wenn Sie selbst eine Leistung anbieten, beschreiben Sie, wen Sie suchen, oder ändern Sie den Text.",
    requiredTask: "Beschreiben Sie die Aufgabe mindestens in einem Satz.",
    requiredFormat: "Bitte die Form wählen.",
    requiredLocation: "Bitte die Stadt angeben.",
    requiredName: "Bitte angeben, wie wir Sie ansprechen dürfen.",
    requiredContact: "Bitte E-Mail oder Telefonnummer angeben.",
    successTitle: "Anfrage gesendet",
    successBody: "Wir haben Ihre Anfrage erhalten.",
    successId: "Anfragenummer",
    explore: "Freuly ansehen",
    privacyBefore: "Mit dem Absenden stimmen Sie der Datenverarbeitung gemäß unserer ",
    privacyLink: "Datenschutzerklärung",
    privacyAfter: " zu.",
  },
};

function choiceClass(active: boolean): string {
  return [
    "min-h-12 rounded-2xl border px-4 py-3 text-left text-base font-semibold transition",
    active
      ? "border-freuly-primary bg-freuly-primary/5 text-freuly-primary"
      : "border-freuly-border-default bg-white text-freuly-text-primary",
  ].join(" ");
}

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin";
  } catch {
    return "Europe/Berlin";
  }
}

function newIdempotencyKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

type Phase =
  | "input"
  | "extracting"
  | "clarification"
  | "review"
  | "submitting"
  | "success"
  | "blocked"
  | "offer"
  | "error";

export default function ConversationalIntake({ lang }: { lang: Lang }) {
  const copy = COPY[lang];
  const locale = lang as ServiceIntentLocale;
  const [phase, setPhase] = useState<Phase>("input");
  const [rawText, setRawText] = useState("");
  const [draft, setDraft] = useState<IntakeDraft | null>(null);
  const [question, setQuestion] = useState<ServiceIntentQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [edits, setEdits] = useState<ReviewEdits | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hp, setHp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [publicId, setPublicId] = useState<string | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  const submitLock = useRef(false);

  function show(next: { draft: IntakeDraft; view: { phase: string; question?: ServiceIntentQuestion } }) {
    setDraft(next.draft);
    setError(null);
    setAnswer("");
    if (next.view.phase === "clarification" && next.view.question) {
      setQuestion(next.view.question);
      setPhase("clarification");
      return;
    }
    if (next.view.phase === "blocked") {
      setPhase("blocked");
      return;
    }
    if (next.view.phase === "offer") {
      setPhase("offer");
      return;
    }
    setEdits(reviewEditsFromDraft(next.draft));
    setQuestion(null);
    setPhase("review");
  }

  async function extract(body: ExtractBody) {
    const response = await fetch("/api/intent/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => null)) as { ok?: boolean } | null;
    if (!response.ok || !payload || payload.ok !== true) return null;
    return payload;
  }

  async function start() {
    if (!canStartIntake(rawText)) {
      setError(copy.requiredTask);
      return;
    }
    idempotencyKey.current = null;
    submitLock.current = false;
    setPhase("extracting");
    setError(null);
    try {
      const payload = await extract(
        buildInitialExtractBody({ rawText, locale, timeZone: browserTimeZone() }),
      );
      if (!payload) {
        setPhase("error");
        setError(copy.aiFailed);
        return;
      }
      show(
        acceptExtraction({
          rawText,
          locale,
          timeZone: browserTimeZone(),
          extraction: payload as IntakeDraft["extraction"],
        }),
      );
    } catch {
      setPhase("error");
      setError(copy.aiFailed);
    }
  }

  async function submitAnswer(clarification: ClarificationAnswer) {
    if (!draft || phase !== "clarification") return;
    const turn = applyClarificationAnswer(draft, clarification);
    if (turn.kind === "invalid") return;
    if (turn.kind === "local") {
      show(turn);
      return;
    }
    setPhase("extracting");
    setError(null);
    try {
      const payload = await extract(turn.body);
      if (!payload) {
        setPhase("clarification");
        setError(copy.aiFailed);
        return;
      }
      show(
        integrateClarificationResult(
          draft,
          payload as IntakeDraft["extraction"],
          turn.askedField,
        ),
      );
    } catch {
      setPhase("clarification");
      setError(copy.aiFailed);
    }
  }

  async function submitRequest() {
    if (phase !== "review" || !draft || !edits || submitLock.current) return;
    if (!idempotencyKey.current) idempotencyKey.current = newIdempotencyKey();
    const built = buildConfirmedServiceRequest({
      draft,
      edits,
      clientName: name,
      clientEmail: email,
      clientPhone: phone,
      idempotencyKey: idempotencyKey.current,
    });
    if (!built.ok) {
      const messages: Record<string, string> = {
        missing_format: copy.requiredFormat,
        missing_location: copy.requiredLocation,
        missing_name: copy.requiredName,
        missing_contact: copy.requiredContact,
      };
      setError(messages[built.code] ?? copy.submitFailed);
      return;
    }
    submitLock.current = true;
    setPhase("submitting");
    setError(null);
    try {
      const response = await fetch("/api/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...built.body, hp }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        public_id?: string;
      };
      if (!response.ok || result.ok !== true || !result.public_id) {
        submitLock.current = false;
        setPhase("review");
        setError(copy.submitFailed);
        return;
      }
      setPublicId(result.public_id);
      setPhase("success");
    } catch {
      submitLock.current = false;
      setPhase("review");
      setError(copy.submitFailed);
    }
  }

  if (phase === "success" && publicId) {
    return (
      <div className={`mx-auto max-w-2xl p-8 text-center sm:p-10 ${publicCardClass}`}>
        <h1 className="text-3xl font-bold text-freuly-text-primary">{copy.successTitle}</h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-freuly-text-secondary">{copy.successBody}</p>
        <p className="mt-6 text-sm font-semibold text-freuly-text-primary">
          {copy.successId}: {publicId}
        </p>
        <Link href={`/${lang}`} className={`${publicLinkSecondaryClass} mt-8 inline-flex`}>
          {copy.explore}
        </Link>
      </div>
    );
  }

  const busy = phase === "extracting" || phase === "submitting";
  const needsCity = edits && edits.workFormat !== "online";
  const safety = draft?.extraction.safety;

  return (
    <div className="mx-auto w-full max-w-2xl">
      {phase === "input" || phase === "error" ? (
        <div className="mb-6 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-freuly-primary">{copy.eyebrow}</p>
          <h1 className="mt-3 text-2xl font-bold text-freuly-text-primary sm:text-4xl">{copy.title}</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-freuly-text-secondary sm:text-base">{copy.subtitle}</p>
        </div>
      ) : null}

      <div className={`p-6 sm:p-8 ${publicCardClass}`}>
        <input
          type="text"
          name="hp"
          value={hp}
          onChange={(event) => setHp(event.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="hidden"
        />

        {phase === "input" || phase === "error" ? (
          <div className="space-y-5">
            <label className="block text-lg font-semibold text-freuly-text-primary" htmlFor="intake-text">
              {copy.taskLabel}
            </label>
            <textarea
              id="intake-text"
              rows={6}
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              placeholder={copy.taskPlaceholder}
              className={`${publicFieldClass} min-h-[160px] w-full`}
            />
            <Button type="button" className="min-h-12 w-full" onClick={() => void start()}>
              {copy.continue}
            </Button>
          </div>
        ) : null}

        {phase === "extracting" ? (
          <p className="py-10 text-center text-base text-freuly-text-secondary" role="status">
            {copy.extracting}
          </p>
        ) : null}

        {phase === "clarification" && question ? (
          <div className="space-y-5">
            <p className="text-sm text-freuly-text-muted">{copy.questionHint}</p>
            <h2 className="text-xl font-bold text-freuly-text-primary">{question.text}</h2>
            {question.field_code === "work_format" ? (
              <div className="grid gap-3">
                <button type="button" className={choiceClass(false)} onClick={() => void submitAnswer({ kind: "work_format", value: "offline" })}>
                  {copy.offline}
                </button>
                <button type="button" className={choiceClass(false)} onClick={() => void submitAnswer({ kind: "work_format", value: "online" })}>
                  {copy.online}
                </button>
                {question.allow_no_preference ? (
                  <button type="button" className={choiceClass(false)} onClick={() => void submitAnswer({ kind: "no_preference" })}>
                    {copy.noPreference}
                  </button>
                ) : null}
              </div>
            ) : null}
            {question.field_code === "preferred_language" ? (
              <div className="grid gap-3">
                {(["ru", "ua", "de"] as const).map((code) => (
                  <button key={code} type="button" className={choiceClass(false)} onClick={() => void submitAnswer({ kind: "language", value: code })}>
                    {copy.languages[code]}
                  </button>
                ))}
              </div>
            ) : null}
            {question.field_code !== "work_format" && question.field_code !== "preferred_language" ? (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitAnswer({ kind: "text", text: answer });
                }}
              >
                <input
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder={copy.answerPlaceholder}
                  className={`${publicFieldClass} w-full`}
                  aria-label={question.text}
                />
                {question.allow_no_preference ? (
                  <button type="button" className={choiceClass(false)} onClick={() => void submitAnswer({ kind: "no_preference" })}>
                    {copy.noPreference}
                  </button>
                ) : null}
                <Button type="submit" className="min-h-12 w-full">{copy.continue}</Button>
              </form>
            ) : null}
          </div>
        ) : null}

        {(phase === "review" || phase === "submitting") && draft && edits ? (
          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-freuly-text-primary">{copy.what}</span>
              <input
                value={edits.requestedService}
                onChange={(event) => setEdits({ ...edits, requestedService: event.target.value })}
                className={`${publicFieldClass} w-full`}
              />
            </label>
            <div>
              <p className="mb-2 text-sm font-semibold text-freuly-text-primary">{copy.format}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ["offline", copy.offline],
                    ["online", copy.online],
                    ["no_preference", copy.either],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={choiceClass(
                      value === "no_preference"
                        ? edits.workFormat === "no_preference" || edits.workFormat === "hybrid"
                        : edits.workFormat === value,
                    )}
                    onClick={() => setEdits({ ...edits, workFormat: value })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {needsCity ? (
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-freuly-text-primary">{copy.where}</span>
                <input
                  value={edits.city}
                  onChange={(event) => setEdits({ ...edits, city: event.target.value })}
                  className={`${publicFieldClass} w-full`}
                  autoComplete="address-level2"
                />
              </label>
            ) : null}
            <div>
              <p className="mb-2 text-sm font-semibold text-freuly-text-primary">{copy.language}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {(["ru", "ua", "de"] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    className={choiceClass(edits.preferredLanguage === code)}
                    onClick={() => setEdits({ ...edits, preferredLanguage: code })}
                  >
                    {copy.languages[code]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-freuly-text-primary">{copy.when}</p>
              <p className="mb-3 text-base text-freuly-text-primary">
                {timingLabel(reviewTiming(draft.extraction, edits), locale)}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["asap", copy.timingAsap],
                    ["next_week", copy.timingWeek],
                    ["next_month", copy.timingMonth],
                    ["flexible", copy.timingFlexible],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={choiceClass(edits.timingPeriod === value)}
                    onClick={() => setEdits({ ...edits, timingPeriod: value })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {draft.extraction.budget_text || draft.extraction.availability_note || draft.extraction.recurrence ? (
              <div>
                <p className="mb-2 text-sm font-semibold text-freuly-text-primary">{copy.additional}</p>
                <p className="whitespace-pre-wrap text-sm text-freuly-text-secondary">
                  {[draft.extraction.budget_text, draft.extraction.availability_note, draft.extraction.recurrence]
                    .filter(Boolean)
                    .join("\n")}
                </p>
              </div>
            ) : null}
            {safety && safety.verdict === "restricted" ? (
              <p className="rounded-xl bg-freuly-page px-4 py-3 text-sm text-freuly-text-secondary">{copy.licensedNote}</p>
            ) : null}
            {safety && safety.verdict === "manual_review" ? (
              <p className="rounded-xl bg-freuly-page px-4 py-3 text-sm text-freuly-text-secondary">{copy.reviewNote}</p>
            ) : null}
            <h2 className="text-lg font-bold text-freuly-text-primary">{copy.contactTitle}</h2>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-freuly-text-primary">{copy.nameLabel}</span>
              <input value={name} onChange={(event) => setName(event.target.value)} className={`${publicFieldClass} w-full`} autoComplete="name" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-freuly-text-primary">{copy.emailLabel}</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={`${publicFieldClass} w-full`} autoComplete="email" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-freuly-text-primary">{copy.phoneLabel}</span>
              <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className={`${publicFieldClass} w-full`} autoComplete="tel" />
            </label>
            <p className="text-xs text-freuly-text-muted">{copy.contactHint}</p>
            <p className="text-xs leading-relaxed text-freuly-text-muted">
              {copy.privacyBefore}
              <Link href={privacyPath(lang)} className="underline">{copy.privacyLink}</Link>
              {copy.privacyAfter}
            </p>
            <Button type="button" className="min-h-12 w-full" disabled={busy} onClick={() => void submitRequest()}>
              {phase === "submitting" ? copy.submitting : copy.submit}
            </Button>
            <button
              type="button"
              className="min-h-12 w-full text-sm text-freuly-text-muted"
              disabled={busy}
              onClick={() => {
                idempotencyKey.current = null;
                submitLock.current = false;
                setError(null);
                setPhase("input");
              }}
            >
              {copy.back}
            </button>
          </div>
        ) : null}

        {phase === "blocked" || phase === "offer" ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-freuly-text-primary">
              {phase === "blocked" ? copy.blockedTitle : copy.offerTitle}
            </h2>
            <p className="text-sm text-freuly-text-secondary">
              {phase === "blocked" ? copy.blockedBody : copy.offerBody}
            </p>
            <Button type="button" className="min-h-12 w-full" onClick={() => setPhase("input")}>
              {copy.back}
            </Button>
          </div>
        ) : null}

        {error ? (
          <p className="mt-5 rounded-xl bg-freuly-page px-4 py-3 text-sm text-freuly-text-secondary" role="alert">
            {error}
          </p>
        ) : null}
        {phase === "error" ? (
          <Button type="button" className="mt-4 min-h-12 w-full" onClick={() => void start()}>
            {copy.retry}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
