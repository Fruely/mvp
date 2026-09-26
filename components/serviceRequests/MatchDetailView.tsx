import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import type { MatchDetail } from "@/lib/inbox/loadMatchDetail";
import MatchResponseForm from "./MatchResponseForm";

type Copy = {
  back: string;
  title: string;
  language: string;
  anyLanguage: string;
  why: string;
  online: string;
  offline: string;
  hybrid: string;
  interested: string;
  declined: string;
  interestedDone: string;
  declinedDone: string;
  expired: string;
  selected: string;
  notSelected: string;
  error: string;
  reasons: Record<string, string>;
  languages: Record<string, string>;
};

const COPY: Record<Lang, Copy> = {
  ru: {
    back: "Подходящие заявки",
    title: "Заявка",
    language: "Язык",
    anyLanguage: "Язык не важен",
    why: "Почему подходит вам",
    online: "Онлайн",
    offline: "На месте",
    hybrid: "Онлайн или на месте",
    interested: "Готов помочь",
    declined: "Не подходит",
    interestedDone: "Вы отметили, что готовы помочь. Контакты клиента пока не открываются.",
    declinedDone: "Вы отметили, что заявка не подходит.",
    expired: "Срок ответа по этой заявке истёк.",
    selected: "Клиент выбрал вас. Откройте диалог во входящих.",
    notSelected: "Клиент выбрал другого специалиста.",
    error: "Не удалось сохранить ответ. Попробуйте ещё раз.",
    reasons: {
      category_match: "Категория совпадает",
      language_match: "Язык",
      format_match: "Формат",
      location_match: "Город",
    },
    languages: { ru: "Русский", uk: "Українська", de: "Deutsch", en: "English" },
  },
  ua: {
    back: "Відповідні заявки",
    title: "Заявка",
    language: "Мова",
    anyLanguage: "Мова не важлива",
    why: "Чому підходить вам",
    online: "Онлайн",
    offline: "На місці",
    hybrid: "Онлайн або на місці",
    interested: "Готовий допомогти",
    declined: "Не підходить",
    interestedDone: "Ви позначили, що готові допомогти. Контакти клієнта поки не відкриваються.",
    declinedDone: "Ви позначили, що заявка не підходить.",
    expired: "Строк відповіді на цю заявку минув.",
    selected: "Клієнт обрав вас. Відкрийте діалог у вхідних.",
    notSelected: "Клієнт обрав іншого спеціаліста.",
    error: "Не вдалося зберегти відповідь. Спробуйте ще раз.",
    reasons: {
      category_match: "Категорія збігається",
      language_match: "Мова",
      format_match: "Формат",
      location_match: "Місто",
    },
    languages: { ru: "Русский", uk: "Українська", de: "Deutsch", en: "English" },
  },
  de: {
    back: "Passende Anfragen",
    title: "Anfrage",
    language: "Sprache",
    anyLanguage: "Sprache egal",
    why: "Warum das passt",
    online: "Online",
    offline: "Vor Ort",
    hybrid: "Online oder vor Ort",
    interested: "Ich kann helfen",
    declined: "Passt nicht",
    interestedDone: "Sie haben Interesse bestätigt. Kontaktdaten werden hier noch nicht gezeigt.",
    declinedDone: "Sie haben die Anfrage abgelehnt.",
    expired: "Die Antwortfrist für diese Anfrage ist abgelaufen.",
    selected: "Der Kunde hat Sie ausgewählt. Öffnen Sie den Dialog im Eingang.",
    notSelected: "Der Kunde hat eine andere Fachkraft gewählt.",
    error: "Die Antwort konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
    reasons: {
      category_match: "Kategorie passt",
      language_match: "Sprache",
      format_match: "Format",
      location_match: "Stadt",
    },
    languages: { ru: "Russisch", uk: "Ukrainisch", de: "Deutsch", en: "Englisch" },
  },
};

function formatLabel(value: string | null, copy: Copy): string | null {
  if (value === "online") return copy.online;
  if (value === "offline") return copy.offline;
  if (value === "hybrid") return copy.hybrid;
  return null;
}

export default function MatchDetailView({
  detail,
  lang,
}: {
  detail: MatchDetail;
  lang: Lang;
}) {
  const copy = COPY[lang];
  const format = formatLabel(detail.workFormat, copy);
  const why = detail.reasons.filter((reason) => reason !== "location_not_required");
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 sm:px-0">
      <Link href={`/${lang}/specialist/dashboard/requests/matched`} className="text-sm font-medium text-emerald-800">
        {copy.back}
      </Link>
      <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold text-gray-900">{detail.title || copy.title}</h1>
        <dl className="mt-4 space-y-2 text-sm text-gray-700">
          {detail.city ? <div><dt className="sr-only">{copy.reasons.location_match}</dt><dd>{detail.city}</dd></div> : null}
          {format ? <div><dt className="sr-only">{copy.reasons.format_match}</dt><dd>{format}</dd></div> : null}
          <div>
            <dt className="sr-only">{copy.language}</dt>
            <dd>
              {detail.serviceLanguages.length
                ? detail.serviceLanguages.map((code) => copy.languages[code] ?? code.toUpperCase()).join(", ")
                : copy.anyLanguage}
            </dd>
          </div>
          <div><dd>{detail.timingLabel}</dd></div>
          <div><dd>{detail.createdAt.slice(0, 16).replace("T", " ")}</dd></div>
        </dl>
        {why.length ? (
          <p className="mt-4 text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{copy.why}: </span>
            {why.map((reason) => copy.reasons[reason] ?? reason).join(" · ")}
          </p>
        ) : null}
        <div className="mt-6">
          <MatchResponseForm
            matchId={detail.matchId}
            status={detail.status}
            labels={{
              interested: copy.interested,
              declined: copy.declined,
              interestedDone: copy.interestedDone,
              declinedDone: copy.declinedDone,
              expired: copy.expired,
              selected: copy.selected,
              notSelected: copy.notSelected,
              error: copy.error,
            }}
          />
        </div>
      </article>
    </div>
  );
}
