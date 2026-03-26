import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Психологи в Германии — украинский и русский язык | Freuly",
  description:
    "Найдите психолога в Германии, который говорит на украинском или русском языке. Онлайн и офлайн консультации. Платформа Freuly.",
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

      {/* Main CTA */}
      <section className="mt-12 rounded-2xl bg-blue-50 px-6 py-10 text-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Готовы найти своего психолога?
        </h2>
        <p className="mx-auto mt-2 max-w-md text-gray-600">
          Выберите специалиста и отправьте заявку — это первый шаг к решению
          вашей ситуации.
        </p>
        <Link
          href="/ua/category/psychologists"
          className="mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-8 text-base font-semibold text-white transition hover:bg-blue-700"
        >
          Найти психолога
        </Link>
      </section>

      {/* Other categories */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-gray-900">
          Другие категории специалистов
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <li>
            <Link href="/ua/category/masseurs" className="text-blue-600 hover:underline">
              Масажисти
            </Link>
          </li>
          <li>
            <Link href="/ua/category/tutors" className="text-blue-600 hover:underline">
              Репетитори
            </Link>
          </li>
          <li>
            <Link href="/ua/category/cosmetology" className="text-blue-600 hover:underline">
              Косметологія
            </Link>
          </li>
          <li>
            <Link href="/ua/category/nutritionists" className="text-blue-600 hover:underline">
              Дієтологи
            </Link>
          </li>
          <li>
            <Link href="/ua/category/it_specialists" className="text-blue-600 hover:underline">
              IT-спеціалісти
            </Link>
          </li>
          <li>
            <Link href="/ua/category/cleaning" className="text-blue-600 hover:underline">
              Прибирання
            </Link>
          </li>
        </ul>
      </section>

      {/* See also */}
      <section className="mt-10 border-t border-gray-200 pt-8">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Дивіться також
        </h3>
        <nav className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href="/ua" className="text-blue-600 hover:underline">
            Головна сторінка
          </Link>
          <Link href="/specialists?lang=uk" className="text-blue-600 hover:underline">
            Усі спеціалісти
          </Link>
          <Link href="/become-specialist" className="text-blue-600 hover:underline">
            Стати спеціалістом
          </Link>
        </nav>
      </section>
    </main>
  );
}
