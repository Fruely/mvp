import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "О платформе Freuly",
  description:
    "Узнайте, зачем создана платформа Freuly и как она помогает находить специалистов на вашем языке.",
};

export default function AboutPage() {
  return (
    <div className="max-w-[900px] mx-auto px-6 py-16">

      <section className="mb-16">
        <h1 className="text-3xl font-bold mb-4">
          О платформе Freuly
        </h1>

        <p className="text-lg text-gray-600 leading-relaxed">
          Freuly — это платформа, которая помогает людям находить специалистов,
          говорящих на их языке, независимо от страны проживания.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">
          Почему появился Freuly?
        </h2>

        <p className="text-gray-700 leading-relaxed mb-4">
          Миллионы людей живут за пределами своей родной страны.
          Переезд в новую страну почти всегда связан с языковыми трудностями
          и отсутствием привычной среды.
        </p>

        <p className="text-gray-700 leading-relaxed">
          Именно для решения этой проблемы была создана платформа Freuly.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">
          Что такое Freuly?
        </h2>

        <p className="text-gray-700 mb-4">
          Freuly — это платформа, где можно находить специалистов разных сфер:
        </p>

        <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
          <li>психологов</li>
          <li>специалистов для дома</li>
          <li>мастеров услуг</li>
          <li>преподавателей</li>
          <li>других профессионалов</li>
        </ul>

        <p className="text-gray-700">
          Вы можете найти специалиста рядом с вами или работать с ним онлайн.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">
          Как работает платформа?
        </h2>

        <ol className="list-decimal pl-6 text-gray-700 space-y-1">
          <li>Вы выбираете категорию</li>
          <li>Находите специалиста</li>
          <li>Оставляете заявку</li>
          <li>Связываетесь напрямую</li>
        </ol>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">
          Наша миссия
        </h2>

        <p className="text-gray-700 leading-relaxed">
          Мы хотим сделать поиск специалистов простым, понятным и доступным.
        </p>
      </section>

      <section className="mb-12 text-center">
        <h2 className="text-xl font-semibold mb-4">
          Вы специалист?
        </h2>

        <p className="text-gray-700 mb-6">
          Создайте профиль на Freuly и начните получать заявки от клиентов.
        </p>

        <Link
          href="/register"
          className="inline-block bg-blue-600 text-white font-semibold px-6 py-3 rounded-full hover:bg-blue-700 transition"
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
import Link from "next/link";

export const metadata = {
  title: "О платформе Freuly",
  description:
    "Узнайте, зачем создана платформа Freuly и как она помогает находить специалистов на вашем языке.",
};

export default function AboutPage() {
  return (
    <div className="max-w-[900px] mx-auto px-6 py-16">
      {/* HERO */}
      <section className="mb-16">
        <h1 className="text-3xl font-bold mb-4">О платформе Freuly</h1>
        <p className="text-lg text-gray-600 leading-relaxed">
          Freuly — это платформа, которая помогает людям находить специалистов,
          говорящих на их языке, независимо от страны проживания.
        </p>
      </section>
      {/* WHY FREULY */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Почему появился Freuly?</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Миллионы людей живут за пределами своей родной страны.
          Переезд в новую страну почти всегда связан с языковыми трудностями,
          незнакомой системой услуг и отсутствием привычной среды.
        </p>
        <p className="text-gray-700 leading-relaxed">
          В такой ситуации особенно сложно найти специалиста,
          которому можно доверять и с которым можно свободно общаться.
          Именно для решения этой проблемы была создана платформа Freuly.
        </p>
      </section>
      {/* WHAT IS FREULY */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Что такое Freuly?</h2>
        <p className="text-gray-700 mb-4">
          Freuly — это платформа, где можно находить специалистов разных сфер:
        </p>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
          <li>психологов</li>
          <li>специалистов для дома</li>
          <li>мастеров услуг</li>
          <li>преподавателей</li>
          <li>других профессионалов</li>
        </ul>
        <p className="text-gray-700 leading-relaxed">
          Вы можете найти специалиста рядом с вами или работать с ним онлайн.
        </p>
      </section>
      {/* HOW IT WORKS */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Как работает платформа?</h2>
        <p className="text-gray-700 mb-4">Freuly делает поиск специалиста простым:</p>
        <ol className="list-decimal pl-6 text-gray-700 space-y-1">
          <li>Вы выбираете категорию</li>
          <li>Находите подходящего специалиста</li>
          <li>Оставляете заявку</li>
          <li>Связываетесь напрямую</li>
        </ol>
      </section>
      {/* FOR WHO */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Для кого создан Freuly?</h2>
        <p className="text-gray-700 mb-4">Платформа объединяет две стороны.</p>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Для клиентов</h3>
            <ul className="list-disc pl-6 text-gray-700">
              <li>быстро находить специалистов</li>
              <li>общаться на понятном языке</li>
              <li>выбирать подходящего специалиста</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Для специалистов</h3>
            <ul className="list-disc pl-6 text-gray-700">
              <li>получать новые заявки</li>
              <li>работать с клиентами своего языка</li>
              <li>развивать профессиональную практику</li>
            </ul>
          </div>
        </div>
      </section>
      {/* SPECIALISTS SECTION */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Почему специалистам стоит присоединиться?</h2>
        <p className="text-gray-700 leading-relaxed mb-4">Freuly — это не только возможность получать новых клиентов.</p>
        <p className="text-gray-700 leading-relaxed mb-4">
          Это пространство, где специалисты могут работать с людьми, которые говорят на их языке и лучше понимают их культурный контекст.
        </p>
        <p className="text-gray-700 leading-relaxed mb-4">
          Когда человек оказывается в новой стране, он часто сталкивается с языковым барьером, сложностями адаптации и чувством одиночества.
        </p>
        <p className="text-gray-700 leading-relaxed mb-4">
          В такой ситуации особенно важно иметь возможность обратиться к специалисту, который говорит на понятном языке.
        </p>
        <p className="text-gray-700 mb-4">Для специалистов это означает:</p>
        <ul className="list-disc pl-6 text-gray-700 space-y-1">
          <li>работать в комфортной языковой среде</li>
          <li>быстрее устанавливать доверие</li>
          <li>помогать людям в сложный период адаптации</li>
        </ul>
      </section>
      {/* MISSION */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Наша миссия</h2>
        <p className="text-gray-700 leading-relaxed">
          Мы хотим сделать поиск специалистов простым, понятным и доступным.
          Freuly помогает людям находить профессионалов, которым можно доверять.
        </p>
      </section>
      {/* CTA */}
      <section className="mb-12 text-center">
        <h2 className="text-xl font-semibold mb-4">Вы специалист?</h2>
        <p className="text-gray-700 mb-6">Создайте профиль на Freuly и начните получать заявки от клиентов.</p>
        <Link
          href="/register"
          className="inline-block bg-blue-600 text-white font-semibold px-6 py-3 rounded-full hover:bg-blue-700 transition"
        >
          Присоединиться к Freuly
        </Link>
      </section>
      {/* BACK */}
      <div className="text-center">
        <Link href="/" className="text-blue-600 hover:underline">
          Вернуться на главную
        </Link>
      </div>
    </div>
  );
}
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "О платформе Freuly",
  description:
    "Узнайте, зачем создана платформа Freuly и как она помогает находить специалистов на вашем языке.",
};

export default function AboutPage() {
  return (
    <div className="max-w-[900px] mx-auto px-6 py-16">

      {/* HERO */}
      <section className="mb-16">
        <h1 className="text-3xl font-bold mb-4">
          О платформе Freuly
        </h1>

        <p className="text-lg text-gray-600 leading-relaxed">
          Freuly — это платформа, которая помогает людям находить специалистов,
          говорящих на их языке, независимо от страны проживания.
        </p>
      </section>


      {/* WHY FREULY */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">
          Почему появился Freuly?
        </h2>

        <p className="text-gray-700 leading-relaxed mb-4">
          Миллионы людей живут за пределами своей родной страны.
          Переезд в новую страну почти всегда связан с языковыми трудностями,
          незнакомой системой услуг и отсутствием привычной среды.
        </p>

        <p className="text-gray-700 leading-relaxed">
          В такой ситуации особенно сложно найти специалиста,
          которому можно доверять и с которым можно свободно общаться.
          Именно для решения этой проблемы была создана платформа Freuly.
        </p>
      </section>


      {/* WHAT IS FREULY */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">
          Что такое Freuly?
        </h2>

        <p className="text-gray-700 mb-4">
          Freuly — это платформа, где можно находить специалистов разных сфер:
        </p>
import Link from "next/link";

export const metadata = {
  title: "О платформе Freuly",
  description:
    "Узнайте, зачем создана платформа Freuly и как она помогает находить специалистов на вашем языке.",
};

export default function AboutPage() {
  return (
    <div className="max-w-[900px] mx-auto px-6 py-16">
      {/* HERO */}
      <section className="mb-16">
        <h1 className="text-3xl font-bold mb-4">О платформе Freuly</h1>
        <p className="text-lg text-gray-600 leading-relaxed">
          Freuly — это платформа, которая помогает людям находить специалистов,
          говорящих на их языке, независимо от страны проживания.
        </p>
      </section>
      {/* WHY FREULY */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Почему появился Freuly?</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Миллионы людей живут за пределами своей родной страны.
          Переезд в новую страну почти всегда связан с языковыми трудностями,
          незнакомой системой услуг и отсутствием привычной среды.
        </p>
        <p className="text-gray-700 leading-relaxed">
          В такой ситуации особенно сложно найти специалиста,
          которому можно доверять и с которым можно свободно общаться.
          Именно для решения этой проблемы была создана платформа Freuly.
        </p>
      </section>
      {/* WHAT IS FREULY */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Что такое Freuly?</h2>
        <p className="text-gray-700 mb-4">
          Freuly — это платформа, где можно находить специалистов разных сфер:
        </p>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
          <li>психологов</li>
          <li>специалистов для дома</li>
          <li>мастеров услуг</li>
          <li>преподавателей</li>
          <li>других профессионалов</li>
        </ul>
        <p className="text-gray-700 leading-relaxed">
          Вы можете найти специалиста рядом с вами или работать с ним онлайн.
        </p>
      </section>
      {/* HOW IT WORKS */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Как работает платформа?</h2>
        <p className="text-gray-700 mb-4">Freuly делает поиск специалиста простым:</p>
        <ol className="list-decimal pl-6 text-gray-700 space-y-1">
          <li>Вы выбираете категорию</li>
          <li>Находите подходящего специалиста</li>
          <li>Оставляете заявку</li>
          <li>Связываетесь напрямую</li>
        </ol>
      </section>
      {/* FOR WHO */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Для кого создан Freuly?</h2>
        <p className="text-gray-700 mb-4">Платформа объединяет две стороны.</p>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Для клиентов</h3>
            <ul className="list-disc pl-6 text-gray-700">
              <li>быстро находить специалистов</li>
              <li>общаться на понятном языке</li>
              <li>выбирать подходящего специалиста</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Для специалистов</h3>
            <ul className="list-disc pl-6 text-gray-700">
              <li>получать новые заявки</li>
              <li>работать с клиентами своего языка</li>
              <li>развивать профессиональную практику</li>
            </ul>
          </div>
        </div>
      </section>
      {/* SPECIALISTS SECTION */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Почему специалистам стоит присоединиться?</h2>
        <p className="text-gray-700 leading-relaxed mb-4">Freuly — это не только возможность получать новых клиентов.</p>
        <p className="text-gray-700 leading-relaxed mb-4">Это пространство, где специалисты могут работать с людьми, которые говорят на их языке и лучше понимают их культурный контекст.</p>
        <p className="text-gray-700 leading-relaxed mb-4">Когда человек оказывается в новой стране, он часто сталкивается с языковым барьером, сложностями адаптации и чувством одиночества.</p>
        <p className="text-gray-700 leading-relaxed mb-4">В такой ситуации особенно важно иметь возможность обратиться к специалисту, который говорит на понятном языке.</p>
        <p className="text-gray-700 mb-4">Для специалистов это означает:</p>
        <ul className="list-disc pl-6 text-gray-700 space-y-1">
          <li>работать в комфортной языковой среде</li>
          <li>быстрее устанавливать доверие</li>
          <li>помогать людям в сложный период адаптации</li>
        </ul>
      </section>
      {/* MISSION */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Наша миссия</h2>
        <p className="text-gray-700 leading-relaxed">
          Мы хотим сделать поиск специалистов простым, понятным и доступным.
          Freuly помогает людям находить профессионалов, которым можно доверять.
        </p>
      </section>
      {/* CTA */}
      <section className="mb-12 text-center">
        <h2 className="text-xl font-semibold mb-4">Вы специалист?</h2>
        <p className="text-gray-700 mb-6">Создайте профиль на Freuly и начните получать заявки от клиентов.</p>
        <Link
          href="/register"
          className="inline-block bg-blue-600 text-white font-semibold px-6 py-3 rounded-full hover:bg-blue-700 transition"
        >
          Присоединиться к Freuly
        </Link>
      </section>
      {/* BACK */}
      <div className="text-center">
        <Link href="/" className="text-blue-600 hover:underline">
          Вернуться на главную
        </Link>
      </div>
    </div>
  );
}
                          Для специалистов
                        </h3>

                        <ul className="list-disc pl-6 text-gray-700">
                          <li>получать новые заявки</li>
                          <li>работать с клиентами своего языка</li>
                          <li>развивать профессиональную практику</li>
                        </ul>
                      </div>
                    </div>
                  </section>


                  {/* SPECIALISTS SECTION */}
                  <section className="mb-12">
                    <h2 className="text-xl font-semibold mb-4">
                      Почему специалистам стоит присоединиться?
                    </h2>

                    <p className="text-gray-700 leading-relaxed mb-4">
                      Freuly — это не только возможность получать новых клиентов.
                    </p>

                    <p className="text-gray-700 leading-relaxed mb-4">
                      Это пространство, где специалисты могут работать с людьми,
                      которые говорят на их языке и лучше понимают их культурный контекст.
                    </p>

                    <p className="text-gray-700 leading-relaxed mb-4">
                      Когда человек оказывается в новой стране,
                      он часто сталкивается с языковым барьером,
                      сложностями адаптации и чувством одиночества.
                    </p>

                    <p className="text-gray-700 leading-relaxed mb-4">
                      В такой ситуации особенно важно иметь возможность обратиться
                      к специалисту, который говорит на понятном языке.
                    </p>

                    <p className="text-gray-700 mb-4">
                      Для специалистов это означает:
                    </p>

                    <ul className="list-disc pl-6 text-gray-700 space-y-1">
                      <li>работать в комфортной языковой среде</li>
                      <li>быстрее устанавливать доверие</li>
                      <li>помогать людям в сложный период адаптации</li>
                    </ul>
                  </section>


                  {/* MISSION */}
                  <section className="mb-12">
                    <h2 className="text-xl font-semibold mb-4">
                      Наша миссия
                    </h2>

                    <p className="text-gray-700 leading-relaxed">
                      Мы хотим сделать поиск специалистов простым, понятным и доступным.
                      Freuly помогает людям находить профессионалов,
                      которым можно доверять.
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
                      className="inline-block bg-blue-600 text-white font-semibold px-6 py-3 rounded-full hover:bg-blue-700 transition"
                    >
                      Присоединиться к Freuly
                    </Link>
                  </section>


                  {/* BACK */}
                  <div className="text-center">
                    <Link href="/" className="text-blue-600 hover:underline">
                      Вернуться на главную
                    </Link>
                  </div>

                </div>
              );
            }
