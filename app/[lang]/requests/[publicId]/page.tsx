import Link from "next/link";
import { notFound } from "next/navigation";
import SelectSpecialistButton from "@/components/selection/SelectSpecialistButton";
import { getCategoryTitle, type Category } from "@/lib/getCategoryTitle";
import { resolveRouteLang, type Lang } from "@/lib/i18n";
import { readRequestAccessToken } from "@/lib/selection/accessCookie";
import { clientRequestPhase, conversationPath } from "@/lib/selection/policy";
import { resolveViewer, loadOwnedRequestView } from "@/lib/selection/view";
import { createSupabaseServerComponentClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PUBLIC_ID = /^REQ-[0-9]{8}-[A-Z0-9]{6}$/;

const COPY: Record<Lang, {
  responses: string;
  searching: string;
  selected: string;
  connected: string;
  completed: string;
  cancelled: string;
  choose: string;
  chooseError: string;
  open: string;
  viewProfile: string;
  verified: string;
  published: string;
  online: string;
  offline: string;
  hybrid: string;
  interested: string;
}> = {
  ru: {
    responses: "На вашу заявку откликнулись специалисты",
    searching: "Ищем специалистов",
    selected: "Вы выбрали специалиста. Теперь можно общаться во Freuly.",
    connected: "Диалог открыт",
    completed: "Заявка завершена",
    cancelled: "Заявка отменена",
    choose: "Выбрать",
    chooseError: "Не удалось выбрать специалиста. Обновите страницу.",
    open: "Открыть диалог",
    viewProfile: "Посмотреть",
    verified: "Проверенный профиль",
    published: "Профиль опубликован",
    online: "Онлайн",
    offline: "Лично",
    hybrid: "Онлайн или лично",
    interested: "Специалист готов помочь",
  },
  ua: {
    responses: "На вашу заявку відгукнулися спеціалісти",
    searching: "Шукаємо спеціалістів",
    selected: "Ви обрали спеціаліста. Тепер можна спілкуватися у Freuly.",
    connected: "Діалог відкрито",
    completed: "Заявку завершено",
    cancelled: "Заявку скасовано",
    choose: "Обрати",
    chooseError: "Не вдалося обрати спеціаліста. Оновіть сторінку.",
    open: "Відкрити діалог",
    viewProfile: "Переглянути",
    verified: "Перевірений профіль",
    published: "Профіль опубліковано",
    online: "Онлайн",
    offline: "Особисто",
    hybrid: "Онлайн або особисто",
    interested: "Спеціаліст готовий допомогти",
  },
  de: {
    responses: "Auf Ihre Anfrage haben sich Fachkräfte gemeldet",
    searching: "Wir suchen Fachkräfte",
    selected: "Sie haben eine Fachkraft gewählt. Sie können jetzt in Freuly schreiben.",
    connected: "Der Dialog ist offen",
    completed: "Die Anfrage ist abgeschlossen",
    cancelled: "Die Anfrage wurde abgebrochen",
    choose: "Auswählen",
    chooseError: "Die Fachkraft konnte nicht ausgewählt werden. Laden Sie die Seite neu.",
    open: "Dialog öffnen",
    viewProfile: "Ansehen",
    verified: "Geprüftes Profil",
    published: "Profil veröffentlicht",
    online: "Online",
    offline: "Vor Ort",
    hybrid: "Online oder vor Ort",
    interested: "Eine Fachkraft kann helfen",
  },
};

export default async function ClientRequestPage({
  params,
}: {
  params: { lang: string; publicId: string } | Promise<{ lang: string; publicId: string }>;
}) {
  const resolved = await Promise.resolve(params);
  const lang: Lang = resolveRouteLang(resolved.lang);
  const publicId = decodeURIComponent(resolved.publicId ?? "").trim();
  if (!PUBLIC_ID.test(publicId)) notFound();

  const session = createSupabaseServerComponentClient();
  const { data } = await session.auth.getUser();
  const supabase = createSupabaseServerClient();
  const viewer = await resolveViewer(supabase, {
    sessionUserId: data.user?.id ?? null,
    accessToken: readRequestAccessToken(),
  });
  const view = await loadOwnedRequestView(supabase, {
    publicId,
    viewer,
    locale: lang,
    categoryTitle: (category, locale) => getCategoryTitle(category as Category, locale),
  });
  if ("error" in view) notFound();

  const copy = COPY[lang];
  const phase = clientRequestPhase({
    status: view.status,
    interestedCount: view.interestedCount,
    selected: Boolean(view.selectedSpecialistId),
    connected: Boolean(view.conversationId),
  });
  const headline =
    phase === "responses_received"
      ? copy.responses
      : phase === "specialist_selected" || phase === "connected"
        ? copy.selected
        : phase === "completed"
          ? copy.completed
          : phase === "cancelled"
            ? copy.cancelled
            : copy.searching;
  const formatLabel = (value: string | null) => {
    if (value === "online") return copy.online;
    if (value === "offline") return copy.offline;
    if (value === "hybrid") return copy.hybrid;
    return null;
  };

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8">
      <section className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5 sm:p-8">
        <p className="text-sm font-medium text-emerald-800">{view.publicId}</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">{view.serviceLabel || headline}</h1>
        <p className="mt-2 text-sm text-gray-700">{headline}</p>
        {view.task ? <p className="mt-4 whitespace-pre-wrap text-sm text-gray-800">{view.task}</p> : null}
        {view.conversationId ? (
          <Link
            href={conversationPath(lang, view.conversationId, "client", view.publicId)}
            className="mt-4 inline-flex text-sm font-semibold text-emerald-800"
          >
            {copy.open}
          </Link>
        ) : null}
      </section>

      {view.cards.map((card) => {
        const place = formatLabel(card.workFormat);
        return (
          <article key={card.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              {card.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={card.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : null}
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{card.displayName}</h2>
                {card.category ? <p className="text-sm text-gray-700">{card.category}</p> : null}
                <p className="mt-1 text-sm text-gray-600">
                  {[card.languages.join(" / "), place, card.city].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {card.verification === "verified" ? copy.verified : copy.published}
                </p>
                {card.matchStatus === "interested" ? (
                  <p className="mt-2 text-sm font-medium text-emerald-800">{copy.interested}</p>
                ) : null}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Link href={card.profilePath} className="text-sm font-semibold text-emerald-800">
                {copy.viewProfile}
              </Link>
              {phase !== "cancelled" && phase !== "completed" && !view.selectedSpecialistId && card.matchStatus === "interested" ? (
                <SelectSpecialistButton
                  publicId={view.publicId}
                  specialistId={card.id}
                  label={copy.choose}
                  errorLabel={copy.chooseError}
                />
              ) : null}
            </div>
          </article>
        );
      })}
    </main>
  );
}
