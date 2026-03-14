import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Для специалистов — Freuly",
  description:
    "Создайте профиль на Freuly и начните получать клиентов в Германии. Без посредников, быстро и бесплатно.",
};

const WHY_CARDS = [
  {
    title: "Клиенты уже ищут услуги",
    description:
      "Люди приходят на Freuly, чтобы найти специалиста для конкретной задачи.",
  },
  {
    title: "Вас легко найти",
    description:
      "Клиенты могут найти специалиста на удобном языке и рядом с собой.",
  },
  {
    title: "Без посредников",
    description:
      "Вы общаетесь с клиентом напрямую и сами договариваетесь о работе.",
  },
] as const;

const STEPS = [
  { number: "1", title: "Создайте профиль", description: "Укажите имя, категорию и город." },
  { number: "2", title: "Опишите услуги", description: "Добавьте описание, цены и фото." },
  { number: "3", title: "Получайте заявки", description: "Клиенты отправляют заявки — вы получаете уведомления." },
] as const;

export default function ForSpecialistsPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Hero */}
      <section className="px-4 pb-20 pt-24 text-center sm:px-6 lg:px-8">
        <h1 className="mx-auto max-w-3xl text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
          Получайте клиентов и&nbsp;развивайте свой бизнес с&nbsp;Freuly
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-gray-600">
          Freuly помогает специалистам находить клиентов в&nbsp;Германии&nbsp;— онлайн и&nbsp;рядом с&nbsp;вами.
        </p>
        <Link
          href="/become-specialist"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-emerald-600 px-7 text-base font-semibold text-white transition hover:bg-emerald-700"
        >
          Создать профиль специалиста
        </Link>
      </section>

      {/* Why Freuly */}
      <section className="bg-gray-50 px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">Почему Freuly</h2>
        <div className="mx-auto mt-12 grid max-w-5xl gap-8 sm:grid-cols-3">
          {WHY_CARDS.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{card.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link
            href="/become-specialist"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-emerald-600 px-7 text-base font-semibold text-white transition hover:bg-emerald-700"
          >
            Создать профиль
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">Как это работает</h2>
        <div className="mx-auto mt-12 grid max-w-4xl gap-10 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.number} className="text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">
                {step.number}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link
            href="/become-specialist"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-emerald-600 px-7 text-base font-semibold text-white transition hover:bg-emerald-700"
          >
            Создать профиль специалиста
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gray-50 px-4 py-20 text-center sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold sm:text-3xl">
          Начните получать клиентов уже&nbsp;сегодня
        </h2>
        <Link
          href="/become-specialist"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-emerald-600 px-7 text-base font-semibold text-white transition hover:bg-emerald-700"
        >
          Создать профиль специалиста
        </Link>
      </section>
    </main>
  );
}
