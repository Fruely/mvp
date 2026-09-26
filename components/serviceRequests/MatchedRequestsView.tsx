import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import type { MatchedRequestsModel } from "@/lib/matching/loadMatchedRequests";

type Copy = {
  kicker: string;
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyBody: string;
  errorTitle: string;
  errorBody: string;
  why: string;
  open: string;
  interested: string;
  declined: string;
  language: string;
  anyLanguage: string;
  online: string;
  offline: string;
  hybrid: string;
  reasons: Record<string, string>;
  languages: Record<string, string>;
};

const COPY: Record<Lang, Copy> = {
  ru: {
    kicker: "Ваша очередь",
    title: "Подходящие заявки",
    subtitle: "Заявки, которые подходят вашему профилю. Контакты клиента здесь не показываются.",
    emptyTitle: "Подходящих заявок пока нет",
    emptyBody: "Когда появится заявка, которая вам подходит, она будет здесь.",
    errorTitle: "Не удалось загрузить заявки",
    errorBody: "Обновите страницу и попробуйте ещё раз.",
    why: "Почему подходит вам",
    open: "Посмотреть заявку",
    interested: "Готов помочь",
    declined: "Не подходит",
    language: "Язык",
    anyLanguage: "Язык не важен",
    online: "Онлайн",
    offline: "На месте",
    hybrid: "Онлайн или на месте",
    reasons: {
      category_match: "Категория совпадает",
      language_match: "Язык",
      format_match: "Формат",
      location_match: "Город",
    },
    languages: { ru: "Русский", uk: "Українська", de: "Deutsch", en: "English" },
  },
  ua: {
    kicker: "Ваша черга",
    title: "Відповідні заявки",
    subtitle: "Заявки, які підходять вашому профілю. Контакти клієнта тут не показуються.",
    emptyTitle: "Відповідних заявок поки немає",
    emptyBody: "Коли з’явиться заявка, яка вам підходить, вона буде тут.",
    errorTitle: "Не вдалося завантажити заявки",
    errorBody: "Оновіть сторінку і спробуйте ще раз.",
    why: "Чому підходить вам",
    open: "Переглянути заявку",
    interested: "Готовий допомогти",
    declined: "Не підходить",
    language: "Мова",
    anyLanguage: "Мова не важлива",
    online: "Онлайн",
    offline: "На місці",
    hybrid: "Онлайн або на місці",
    reasons: {
      category_match: "Категорія збігається",
      language_match: "Мова",
      format_match: "Формат",
      location_match: "Місто",
    },
    languages: { ru: "Русский", uk: "Українська", de: "Deutsch", en: "English" },
  },
  de: {
    kicker: "Ihre Warteschlange",
    title: "Passende Anfragen",
    subtitle: "Anfragen, die zu Ihrem Profil passen. Kontaktdaten der Kundin oder des Kunden werden hier nicht gezeigt.",
    emptyTitle: "Noch keine passenden Anfragen",
    emptyBody: "Sobald eine passende Anfrage eingeht, erscheint sie hier.",
    errorTitle: "Anfragen konnten nicht geladen werden",
    errorBody: "Bitte laden Sie die Seite neu.",
    why: "Warum das passt",
    open: "Anfrage ansehen",
    interested: "Ich kann helfen",
    declined: "Passt nicht",
    language: "Sprache",
    anyLanguage: "Sprache egal",
    online: "Online",
    offline: "Vor Ort",
    hybrid: "Online oder vor Ort",
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

function languageLabel(code: string, copy: Copy): string {
  return copy.languages[code] ?? code.toUpperCase();
}

export default function MatchedRequestsView({
  model,
  lang,
}: {
  model: MatchedRequestsModel;
  lang: Lang;
}) {
  const copy = COPY[lang];
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 sm:px-0">
      <section className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">{copy.kicker}</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">{copy.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-700">{copy.subtitle}</p>
      </section>

      {model.status === "error" ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 text-center" role="alert">
          <h2 className="text-lg font-semibold text-gray-900">{copy.errorTitle}</h2>
          <p className="mt-2 text-sm text-gray-600">{copy.errorBody}</p>
        </section>
      ) : null}

      {model.status === "empty" ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
          <h2 className="text-lg font-semibold text-gray-900">{copy.emptyTitle}</h2>
          <p className="mt-2 text-sm text-gray-600">{copy.emptyBody}</p>
        </section>
      ) : null}

      {model.status === "ready"
        ? model.items.map((item) => {
            const format = formatLabel(item.workFormat, copy);
            const why = item.reasons.filter((reason) => reason !== "location_not_required");
            return (
              <article key={item.matchId} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">
                    <Link href={`/${lang}/specialist/dashboard/requests/matched/${item.matchId}`} className="hover:underline">
                      {item.title || copy.title}
                    </Link>
                  </h2>
                  {item.responseStatus === "active" ? null : (
                    <span className="text-xs font-medium text-gray-500">
                      {item.responseStatus === "interested" ? copy.interested : copy.declined}
                    </span>
                  )}
                </div>
                <dl className="mt-3 space-y-1 text-sm text-gray-700">
                  {item.city ? <div><dt className="sr-only">{copy.reasons.location_match}</dt><dd>{item.city}</dd></div> : null}
                  {format ? <div><dt className="sr-only">{copy.reasons.format_match}</dt><dd>{format}</dd></div> : null}
                  <div>
                    <dt className="sr-only">{copy.language}</dt>
                    <dd>
                      {item.serviceLanguages.length
                        ? item.serviceLanguages.map((code) => languageLabel(code, copy)).join(", ")
                        : copy.anyLanguage}
                    </dd>
                  </div>
                  <div><dd>{item.timingLabel}</dd></div>
                  <div><dd>{item.createdAt.slice(0, 16).replace("T", " ")}</dd></div>
                </dl>
                {why.length ? (
                  <p className="mt-4 text-sm text-gray-600">
                    <span className="font-semibold text-gray-900">{copy.why}: </span>
                    {why.map((reason) => copy.reasons[reason] ?? reason).join(" · ")}
                  </p>
                ) : null}
                <Link
                  href={`/${lang}/specialist/dashboard/requests/matched/${item.matchId}`}
                  className="mt-4 inline-block text-sm font-semibold text-emerald-800"
                >
                  {copy.open}
                </Link>
              </article>
            );
          })
        : null}
    </div>
  );
}
