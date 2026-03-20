import Link from "next/link";
import { Metadata } from "next";
import { getDictionary, t, isSupportedLang, type Lang } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "О платформе Freuly",
  description:
    "Freuly — платформа, которая помогает людям находить специалистов, говорящих на их языке.",
};

export default async function AboutPage({ params }: { params: { lang: string } }) {
  const lang: Lang = isSupportedLang(params.lang) ? params.lang : "ua";
  const dict = await getDictionary(lang);
  const noticeTitle = t(dict, "page.notice.originalRuTitle");
  const noticeBody = t(dict, "page.notice.originalRuBody");

  return (
    <div className="max-w-[900px] mx-auto px-6 py-16">

      {noticeTitle && (
        <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <p className="font-medium">{noticeTitle}</p>
          {noticeBody && <p className="mt-1">{noticeBody}</p>}
        </div>
      )}

      {/* Hero */}
      <section className="mb-16">
        <h1 className="text-3xl font-bold mb-4">
          {t(dict, "about.title")}
        </h1>

        <p className="text-lg text-gray-600 leading-relaxed">
          Freuly — это платформа, которая помогает людям находить специалистов,
          говорящих на их языке. Мы создаём пространство, где клиенты и
          профессионалы могут легко находить друг друга и общаться без
          языкового барьера.
        </p>
      </section>


      {/* Почему появился Freuly */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">
          Почему появился Freuly?
        </h2>

        <p className="text-gray-700 leading-relaxed mb-4">
          Миллионы людей живут за пределами своей родной страны. Переезд,
          адаптация и жизнь в новой культурной среде часто сопровождаются
          языковыми трудностями.
        </p>

        <p className="text-gray-700 leading-relaxed">
          Когда человеку нужен специалист — психолог, мастер, преподаватель
          или консультант — ему важно чувствовать понимание и доверие.
          Общение на родном языке часто становится ключевым фактором
          такого доверия.
        </p>
      </section>


      {/* Что такое Freuly */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">
          Что такое Freuly?
        </h2>

        <p className="text-gray-700 mb-4">
          Freuly — это платформа, где можно найти специалистов различных
          сфер услуг:
        </p>

        <ul className="list-disc pl-6 text-gray-700 space-y-1">
          <li>психологи и консультанты</li>
          <li>специалисты для дома</li>
          <li>мастера услуг</li>
          <li>преподаватели и наставники</li>
          <li>другие профессионалы</li>
        </ul>

        <p className="text-gray-700 mt-4">
          Специалисты могут работать как онлайн, так и локально в своём городе.
        </p>
      </section>


      {/* Как работает платформа */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">
          Как работает платформа
        </h2>

        <ol className="list-decimal pl-6 text-gray-700 space-y-2">
          <li>Вы выбираете категорию услуг</li>
          <li>Находите специалиста</li>
          <li>Оставляете заявку</li>
          <li>Связываетесь напрямую</li>
        </ol>

        <p className="text-gray-700 mt-4">
          Freuly помогает людям находить специалистов проще и быстрее.
        </p>
      </section>


      {/* Для кого создан Freuly */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">
          Для кого создан Freuly
        </h2>

        <p className="text-gray-700 leading-relaxed mb-4">
          Платформа создана как для клиентов, так и для специалистов.
        </p>

        <ul className="list-disc pl-6 text-gray-700 space-y-2">
          <li>для людей, которым важно получать услуги на понятном языке</li>
          <li>для специалистов, которые хотят работать с клиентами своего языка</li>
          <li>для профессионалов, которые хотят расширить свою практику</li>
        </ul>
      </section>


      {/* Почему специалистам стоит присоединиться */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">
          Почему специалистам стоит присоединиться
        </h2>

        <p className="text-gray-700 leading-relaxed mb-4">
          Freuly — это не только возможность получать новых клиентов.
          Это также пространство, где специалисты могут помогать людям,
          которые находятся в похожей жизненной ситуации.
        </p>

        <p className="text-gray-700 leading-relaxed">
          Многие специалисты сами проходили путь переезда и адаптации.
          Поэтому помощь людям, говорящим на их языке, становится
          не только работой, но и важной человеческой миссией.
        </p>
      </section>


      {/* Миссия */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">
          Наша миссия
        </h2>

        <p className="text-gray-700 leading-relaxed">
          Мы хотим сделать поиск специалистов простым, прозрачным и
          доступным для людей в любой стране.
        </p>
      </section>


      {/* CTA */}
      <section className="mb-12 text-center">
        <h2 className="text-xl font-semibold mb-4">
          Вы специалист?
        </h2>

        <p className="text-gray-700 mb-6">
          Создайте профиль на Freuly и начните получать заявки от клиентов.
        </p>

        <Link
          href="/register"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition"
        >
          Присоединиться к Freuly
        </Link>
      </section>


      <div className="text-center">
        <Link href="/" className="text-blue-600 hover:underline">
          Вернуться на главную
        </Link>
      </div>

    </div>
  );
}