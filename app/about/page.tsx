import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "О платформе Freuly",
  description:
    "Узнайте, зачем создана платформа Freuly и как она помогает находить специалистов на вашем языке.",
};

export default function AboutPage() {
  return (
    <div className="max-w-[900px] mx-auto px-5 py-12">
      {/* Hero */}
      <h1 className="text-3xl font-bold mb-4">О платформе Freuly</h1>
      <p className="text-lg text-[#555] mb-10">
        Freuly — это платформа, которая помогает людям находить специалистов,
        говорящих на их языке, в любой стране.
      </p>

      {/* Q&A Blocks */}
      <section className="mb-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2 text-[#111]">Почему появился Freuly?</h2>
          <p className="text-base leading-relaxed text-[#444] mb-6">
            Многие люди живут за пределами своей страны или часто переезжают.
            В новой стране бывает сложно найти специалиста, которому можно доверять — особенно если возникает языковой барьер.
            <br />
            <br />
            Freuly создан, чтобы решить эту проблему.
            Платформа помогает находить специалистов, которые говорят на вашем языке.
          </p>
        </div>
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2 text-[#111]">Что такое Freuly?</h2>
          <p className="text-base leading-relaxed text-[#444] mb-6">
            Freuly — это платформа, где люди могут находить специалистов различных сфер:
            <br />
            <ul className="list-disc pl-6 mb-2">
              <li>психологов</li>
              <li>мастеров услуг</li>
              <li>специалистов для дома</li>
              <li>преподавателей</li>
              <li>других профессионалов</li>
            </ul>
            Вы можете найти специалиста рядом с вами или онлайн.
          </p>
        </div>
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2 text-[#111]">Как работает платформа?</h2>
          <p className="text-base leading-relaxed text-[#444] mb-6">
            Freuly делает поиск специалиста простым:
            <br />
            <ol className="list-decimal pl-6 mb-2">
              <li>Вы выбираете категорию</li>
              <li>Находите специалиста</li>
              <li>Оставляете заявку</li>
              <li>Связываетесь напрямую</li>
            </ol>
            Без сложных посредников.
          </p>
        </div>
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2 text-[#111]">Для кого создан Freuly?</h2>
          <p className="text-base leading-relaxed text-[#444] mb-6">
            Платформа создана для двух сторон.
            <br />
            <b>Для клиентов:</b>
            <ul className="list-disc pl-6 mb-2">
              <li>чтобы легко находить специалистов</li>
            </ul>
            <b>Для специалистов:</b>
            <ul className="list-disc pl-6 mb-2">
              <li>чтобы получать новые заявки от клиентов</li>
            </ul>
          </p>
        </div>
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2 text-[#111]">Почему специалистам стоит присоединиться к Freuly?</h2>
          <p className="text-base leading-relaxed text-[#444] mb-6">
            Freuly — это не только возможность получать новых клиентов.
            <br />
            Это пространство, где специалисты могут работать с людьми, которые говорят на их языке и лучше понимают их культурный контекст.
            <br />
            Когда человек оказывается в новой стране, он часто сталкивается с языковым барьером, непониманием системы и чувством одиночества.
            <br />
            В такой ситуации особенно важно иметь возможность обратиться к специалисту, который говорит на понятном языке.
            <br />
            Для специалистов это означает:
            <ul className="list-disc pl-6 mb-2">
              <li>работать в комфортной языковой среде</li>
              <li>быстрее устанавливать доверие с клиентами</li>
              <li>помогать людям, которые находятся в похожей жизненной ситуации</li>
            </ul>
            Многие специалисты сами проходили через опыт переезда и адаптации.
            <br />
            Поэтому помощь людям, которые проходят через те же сложности, становится не только профессиональной деятельностью, но и важной человеческой миссией.
            <br />
            Freuly объединяет специалистов, которые хотят не просто оказывать услуги, но и быть частью сообщества взаимной поддержки.
          </p>
        </div>
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2 text-[#111]">Наша миссия</h2>
          <p className="text-base leading-relaxed text-[#444] mb-6">
            Мы хотим сделать поиск специалистов простым, понятным и доступным.
            <br />
            Freuly помогает людям находить профессионалов, которым можно доверять.
          </p>
        </div>
      </section>

      {/* Specialist CTA */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2 text-[#111]">Вы специалист?</h2>
        <p className="text-base leading-relaxed text-[#444] mb-6">
          Создайте профиль на Freuly и начните получать заявки от клиентов.
        </p>
        <Link href="/register" className="inline-block bg-blue-600 text-white font-semibold rounded-full px-6 py-3 hover:bg-blue-700 transition mb-6">
          Присоединиться к Freuly
        </Link>
      </section>

      {/* Back to home */}
      <div className="mt-8">
        <Link href="/" className="text-blue-600 hover:underline text-base">
          Вернуться на главную
        </Link>
      </div>
    </div>
  );
}
