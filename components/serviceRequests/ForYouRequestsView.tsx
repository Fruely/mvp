import Link from "next/link";
import { t, type Dictionary, type Lang } from "@/lib/i18n";
import { buildPromotedAcceptUrl } from "@/lib/serviceRequests/promotionPublicView";
import type { ForYouRequestsModel } from "@/lib/serviceRequests/forYouRequests";

function formatDate(value: string, lang: Lang): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat(lang === "de" ? "de-DE" : lang === "ua" ? "uk-UA" : "ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function formatValue(value: string | null, lang: Lang): string | null {
  if (!value) return null;
  if (value === "online") return lang === "de" ? "Online" : lang === "ua" ? "Онлайн" : "Онлайн";
  if (value === "offline") return lang === "de" ? "Vor Ort" : lang === "ua" ? "Офлайн" : "Офлайн";
  if (value === "hybrid") return lang === "de" ? "Online oder vor Ort" : lang === "ua" ? "Онлайн або офлайн" : "Онлайн или офлайн";
  return value;
}

export default function ForYouRequestsView({
  model,
  lang,
  dict,
}: {
  model: ForYouRequestsModel;
  lang: Lang;
  dict: Dictionary;
}) {
  const title = t(dict, "dashboard.forYou.title", { defaultValue: "Заявки для вас" });
  const subtitle = t(dict, "dashboard.forYou.subtitle", {
    defaultValue: "Опубликованные запросы, которые подходят вашему профилю.",
  });

  if (!model.eligible) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
          {t(dict, "dashboard.forYou.kicker", { defaultValue: "Для специалистов" })}
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-700">
          {t(dict, "dashboard.forYou.paidOnly", {
            defaultValue: "Раздел доступен специалистам с активным тарифом Freuly Pro.",
          })}
        </p>
        <Link
          href={`/${lang}/specialist/dashboard/subscription`}
          className="mt-6 inline-flex rounded-xl bg-freuly-primary px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
        >
          {t(dict, "dashboard.forYou.subscriptionCta", { defaultValue: "Посмотреть тарифы" })}
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
          {t(dict, "dashboard.forYou.kicker", { defaultValue: "Для специалистов" })}
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-700">{subtitle}</p>
      </section>

      {model.items.length === 0 ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            {t(dict, "dashboard.forYou.emptyTitle", { defaultValue: "Подходящих новых заявок пока нет" })}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-gray-600">
            {t(dict, "dashboard.forYou.emptyBody", {
              defaultValue: "Мы покажем здесь новые опубликованные запросы, когда они совпадут с вашим профилем.",
            })}
          </p>
        </section>
      ) : (
        <div className="grid gap-4">
          {model.items.map((item) => {
            const location = [item.postalCode, item.city].filter(Boolean).join(" ");
            const format = formatValue(item.workFormat, lang);
            return (
              <article key={item.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900">{item.title}</h2>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{item.summary}</p>
                  </div>
                  <Link
                    href={buildPromotedAcceptUrl(lang, item.publicToken)}
                    className="inline-flex shrink-0 items-center justify-center rounded-xl bg-freuly-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                  >
                    {t(dict, "dashboard.forYou.open", { defaultValue: "Открыть заявку" })}
                  </Link>
                </div>
                <dl className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-600">
                  {item.preferredLanguage ? <div><dt className="sr-only">{t(dict, "dashboard.forYou.language", { defaultValue: "Язык" })}</dt><dd><span className="font-semibold text-gray-900">{t(dict, "dashboard.forYou.language", { defaultValue: "Язык" })}:</span> {item.preferredLanguage}</dd></div> : null}
                  {location ? <div><dt className="sr-only">{t(dict, "dashboard.forYou.location", { defaultValue: "Место" })}</dt><dd><span className="font-semibold text-gray-900">{t(dict, "dashboard.forYou.location", { defaultValue: "Место" })}:</span> {location}</dd></div> : null}
                  {format ? <div><dt className="sr-only">{t(dict, "dashboard.forYou.format", { defaultValue: "Формат" })}</dt><dd><span className="font-semibold text-gray-900">{format}</span></dd></div> : null}
                  <div><dt className="sr-only">{t(dict, "dashboard.forYou.published", { defaultValue: "Опубликовано" })}</dt><dd>{formatDate(item.publishedAt, lang)}</dd></div>
                </dl>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
