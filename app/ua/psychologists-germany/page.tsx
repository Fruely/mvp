import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Психологи в Германии на украинском | Freuly",
  description:
    "Найдите психолога в Германии, который говорит на украинском языке. Онлайн и офлайн консультации.",
  alternates: {
    canonical: "https://freuly.de/ua/psychologists-germany",
  },
};

export default function PsychologistsGermanyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        Психологи в Германии, говорящие на украинском
      </h1>

      <div className="mt-6 space-y-4 text-base leading-relaxed text-gray-700">
        <p>
          Переезд в Германию — это серьёзный жизненный шаг, связанный с
          адаптацией, стрессом и множеством вопросов. Найти психолога, который
          говорит на вашем языке, — один из самых важных шагов к комфортной жизни
          в новой стране.
        </p>
        <p>
          На платформе Freuly вы можете найти украиноязычных психологов,
          работающих в Германии — как офлайн, так и онлайн. Это специалисты,
          которые понимают вашу культуру и контекст.
        </p>
        <p>
          Вам не нужно объяснять базовые вещи или подбирать слова на чужом
          языке — вы можете говорить свободно и быть понятым.
        </p>
      </div>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-gray-900">
          Почему важно говорить на родном языке
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-gray-700">
          <li>Проще выражать эмоции и описывать переживания</li>
          <li>Легче задавать сложные и личные вопросы</li>
          <li>Быстрее возникает доверие между вами и специалистом</li>
          <li>Нет барьера перевода — терапия проходит естественно</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-gray-900">
          Как выбрать психолога
        </h2>
        <p className="mt-3 text-gray-700 leading-relaxed">
          Обратите внимание на специализацию, формат работы (онлайн или офлайн) и
          отзывы других клиентов. На Freuly каждый специалист указывает языки,
          на которых работает, свой город и направление. Вы можете сравнить
          несколько профилей и выбрать того, кто вам подходит.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-gray-900">
          Доступные специалисты
        </h2>
        <p className="mt-3 text-gray-600 italic">
          Список специалистов этой категории появится здесь по мере расширения
          базы Freuly.
        </p>
      </section>

      <section className="mt-12 rounded-2xl bg-blue-50 px-6 py-8 text-center">
        <p className="text-lg font-medium text-gray-900">
          Выберите специалиста и отправьте заявку — это первый шаг к решению
          вашей ситуации.
        </p>
        <Link
          href="/ua"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Перейти к поиску
        </Link>
      </section>

      <nav className="mt-10 flex flex-wrap gap-4 text-sm text-blue-600">
        <Link href="/ua" className="hover:underline">
          ← Главная
        </Link>
        <Link href="/become-specialist" className="hover:underline">
          Стать специалистом
        </Link>
      </nav>
    </main>
  );
}
