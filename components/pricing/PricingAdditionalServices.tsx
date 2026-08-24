import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { brandPlanText } from "@/lib/pricing/planDisplayBranding";

type ServiceItem = {
  title: string;
  price: string;
  badge?: string;
  body: string;
  bullets: string[];
};

const COPY: Record<
  Lang,
  {
    kicker: string;
    title: string;
    subtitle: string;
    items: ServiceItem[];
    socialTitle: string;
    socialBody: string;
    cta: string;
    note: string;
  }
> = {
  ru: {
    kicker: "Дополнительные услуги",
    title: "Не хотите заниматься упаковкой самостоятельно?",
    subtitle:
      "Тариф подключает инструменты Freuly и канал клиентских заявок. Ручная работа нашей команды оплачивается отдельно — только если она вам действительно нужна.",
    items: [
      {
        title: "Заполнение профиля",
        price: "30 € разово",
        body: "Для тех, у кого уже есть готовые материалы, но нет желания самостоятельно переносить и оформлять их в профиле.",
        bullets: [
          "вы присылаете готовую информацию и материалы",
          "мы структурируем их по полям профиля",
          "без разработки маркетингового позиционирования",
        ],
      },
      {
        title: "Профессиональная упаковка продукта",
        price: "149 € разово",
        badge: "Маркетинговая услуга",
        body: "Для специалиста, которому нужно не просто заполнить страницу, а профессионально представить своё предложение на Pro Page.",
        bullets: [
          "структурированная анкета о продукте и целевой аудитории",
          "позиционирование и сильный основной оффер",
          "заголовок, описание, услуги и смысловые блоки",
          "структура доверия и CTA",
          "готовая логика наполнения Pro Page",
          "один согласованный раунд правок",
        ],
      },
    ],
    socialTitle: "Упаковка социальных сетей",
    socialBody:
      "Если вашему предложению нужна единая подача не только на Freuly, но и в социальных сетях, мы можем отдельно оценить упаковку профиля, описаний и ключевых сообщений для ваших каналов.",
    cta: "Обсудить дополнительную услугу",
    note: "Дополнительные услуги не входят в стоимость Professional или Growth и не являются обязательными для использования платформы.",
  },
  ua: {
    kicker: "Додаткові послуги",
    title: "Не хочете займатися оформленням самостійно?",
    subtitle:
      "Тариф підключає інструменти Freuly і канал клієнтських запитів. Ручна робота нашої команди оплачується окремо — лише якщо вона вам справді потрібна.",
    items: [
      {
        title: "Заповнення профілю",
        price: "30 € одноразово",
        body: "Для тих, у кого вже є готові матеріали, але немає бажання самостійно переносити й оформлювати їх у профілі.",
        bullets: [
          "ви надсилаєте готову інформацію та матеріали",
          "ми структуруємо їх за полями профілю",
          "без розробки маркетингового позиціонування",
        ],
      },
      {
        title: "Професійне оформлення продукту",
        price: "149 € одноразово",
        badge: "Маркетингова послуга",
        body: "Для спеціаліста, якому потрібно не просто заповнити сторінку, а професійно представити свою пропозицію на Pro Page.",
        bullets: [
          "структурована анкета про продукт і цільову аудиторію",
          "позиціонування та сильний основний офер",
          "заголовок, опис, послуги та змістові блоки",
          "структура довіри та CTA",
          "готова логіка наповнення Pro Page",
          "один погоджений раунд правок",
        ],
      },
    ],
    socialTitle: "Оформлення соціальних мереж",
    socialBody:
      "Якщо вашій пропозиції потрібна єдина подача не лише на Freuly, а й у соціальних мережах, ми можемо окремо оцінити оформлення профілю, описів і ключових повідомлень для ваших каналів.",
    cta: "Обговорити додаткову послугу",
    note: "Додаткові послуги не входять у вартість Professional або Growth і не є обов’язковими для використання платформи.",
  },
  de: {
    kicker: "Zusatzleistungen",
    title: "Sie möchten die Aufbereitung nicht selbst übernehmen?",
    subtitle:
      "Der Tarif aktiviert die Freuly-Werkzeuge und den Kundenanfrage-Kanal. Manuelle Leistungen unseres Teams werden separat berechnet — nur wenn Sie sie tatsächlich benötigen.",
    items: [
      {
        title: "Profilbefüllung",
        price: "30 € einmalig",
        body: "Für Spezialisten mit fertigen Materialien, die ihre Inhalte nicht selbst in das Profil übertragen und strukturieren möchten.",
        bullets: [
          "Sie liefern fertige Informationen und Materialien",
          "wir strukturieren sie in den Profilfeldern",
          "ohne Entwicklung einer Marketingpositionierung",
        ],
      },
      {
        title: "Professionelle Produktaufbereitung",
        price: "149 € einmalig",
        badge: "Marketingleistung",
        body: "Für Spezialisten, die ihre Seite nicht nur ausfüllen, sondern ihr Angebot auf der Pro Page professionell positionieren möchten.",
        bullets: [
          "strukturierter Fragebogen zu Produkt und Zielgruppe",
          "Positionierung und Kernangebot",
          "Überschrift, Beschreibung, Leistungen und Inhaltsblöcke",
          "Vertrauensstruktur und CTA",
          "fertige Inhaltslogik für die Pro Page",
          "eine abgestimmte Korrekturrunde",
        ],
      },
    ],
    socialTitle: "Social-Media-Aufbereitung",
    socialBody:
      "Wenn Ihr Angebot nicht nur auf Freuly, sondern auch in sozialen Medien konsistent präsentiert werden soll, können wir Profil, Beschreibungen und Kernbotschaften für Ihre Kanäle separat kalkulieren.",
    cta: "Zusatzleistung besprechen",
    note: "Zusatzleistungen sind nicht im Preis von Professional oder Growth enthalten und nicht Voraussetzung für die Nutzung der Plattform.",
  },
};

export default function PricingAdditionalServices({ lang }: { lang: Lang }) {
  const copy = COPY[lang] ?? COPY.ua;

  return (
    <section className="mx-auto mt-16 max-w-5xl">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600/90">
          {copy.kicker}
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
          {copy.title}
        </h2>
        <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-gray-600 sm:text-base">
          {copy.subtitle}
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {copy.items.map((item) => (
          <article key={item.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-950">{item.title}</h3>
                <p className="mt-2 text-2xl font-semibold text-indigo-700">{item.price}</p>
              </div>
              {item.badge ? (
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  {item.badge}
                </span>
              ) : null}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">{item.body}</p>
            <ul className="mt-5 space-y-2 text-sm text-gray-700">
              {item.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2.5">
                  <span className="mt-0.5 text-indigo-500" aria-hidden>
                    ✓
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-6 sm:p-7">
        <h3 className="text-lg font-semibold text-gray-950">{copy.socialTitle}</h3>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-700">{copy.socialBody}</p>
        <div className="mt-5">
          <Link
            href={`/${lang}/support`}
            className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            {copy.cta}
          </Link>
        </div>
      </div>

      <p className="mt-4 text-center text-xs leading-relaxed text-gray-500">{brandPlanText(copy.note)}</p>
    </section>
  );
}
