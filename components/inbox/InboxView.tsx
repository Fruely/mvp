import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import type { InboxListModel } from "@/lib/inbox/loadInbox";
import { renderMatchNotice } from "@/lib/inbox/render";
import InboxReadButton from "./InboxReadButton";

type Copy = {
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyBody: string;
  errorTitle: string;
  errorBody: string;
  unread: string;
  read: string;
  markRead: string;
  open: string;
};

const COPY: Record<Lang, Copy> = {
  ru: {
    title: "Входящие",
    subtitle: "Системные события Freuly. Здесь появляется новая подходящая заявка.",
    emptyTitle: "Пока пусто",
    emptyBody: "Когда для вас появится событие, оно будет здесь.",
    errorTitle: "Не удалось загрузить входящие",
    errorBody: "Обновите страницу и попробуйте ещё раз.",
    unread: "Не прочитано",
    read: "Прочитано",
    markRead: "Отметить прочитанным",
    open: "Посмотреть заявку",
  },
  ua: {
    title: "Вхідні",
    subtitle: "Системні події Freuly. Тут з’являється нова відповідна заявка.",
    emptyTitle: "Поки порожньо",
    emptyBody: "Коли для вас з’явиться подія, вона буде тут.",
    errorTitle: "Не вдалося завантажити вхідні",
    errorBody: "Оновіть сторінку і спробуйте ще раз.",
    unread: "Не прочитано",
    read: "Прочитано",
    markRead: "Позначити прочитаним",
    open: "Переглянути заявку",
  },
  de: {
    title: "Eingang",
    subtitle: "Systemereignisse von Freuly. Hier erscheint eine neue passende Anfrage.",
    emptyTitle: "Noch leer",
    emptyBody: "Sobald ein Ereignis für Sie vorliegt, erscheint es hier.",
    errorTitle: "Eingang konnte nicht geladen werden",
    errorBody: "Bitte laden Sie die Seite neu.",
    unread: "Ungelesen",
    read: "Gelesen",
    markRead: "Als gelesen markieren",
    open: "Anfrage ansehen",
  },
};

export default function InboxView({ model, lang }: { model: InboxListModel; lang: Lang }) {
  const copy = COPY[lang];
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 sm:px-0">
      <section className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5 sm:p-8">
        <h1 className="text-2xl font-semibold text-gray-900">{copy.title}</h1>
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
            const text = item.payload
              ? renderMatchNotice(lang, {
                  stage: item.payload.stage,
                  opened: item.payload.opened,
                  serviceLabel: item.payload.service_label,
                  workFormat: item.payload.work_format,
                  city: item.payload.city,
                  serviceLanguages: item.payload.service_languages,
                })
              : { title: item.type, body: "" };
            const href = item.payload
              ? `/${lang}/specialist/dashboard/requests/matched/${item.payload.match_id}`
              : `/${lang}/specialist/dashboard/inbox`;
            return (
              <article key={item.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">{text.title}</h2>
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {item.readAt ? copy.read : copy.unread}
                  </span>
                </div>
                {text.body ? <p className="mt-2 text-sm text-gray-700">{text.body}</p> : null}
                <p className="mt-2 text-xs text-gray-500">{item.createdAt.slice(0, 16).replace("T", " ")}</p>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <Link href={href} className="text-sm font-semibold text-emerald-800">
                    {copy.open}
                  </Link>
                  {item.readAt ? null : <InboxReadButton inboxId={item.id} label={copy.markRead} />}
                </div>
              </article>
            );
          })
        : null}
    </div>
  );
}
