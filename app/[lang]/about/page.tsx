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

        <p className="text-lg text-gray-600">
          Freuly — это платформа, которая помогает людям находить специалистов,
          говорящих на их языке.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">
          Почему появился Freuly?
        </h2>

        <p className="text-gray-700 mb-4">
          Многие люди живут за пределами своей страны и сталкиваются с языковым
          барьером при поиске специалистов.
        </p>

        <p className="text-gray-700">
          Freuly помогает находить специалистов, с которыми можно общаться
          на родном языке.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">
          Что такое Freuly?
        </h2>

        <ul className="list-disc pl-6 text-gray-700 space-y-1">
          <li>психологи</li>
          <li>специалисты для дома</li>
          <li>мастера услуг</li>
          <li>преподаватели</li>
        </ul>
      </section>

      <section className="mb-12 text-center">
        <h2 className="text-xl font-semibold mb-4">
          Вы специалист?
        </h2>

        <Link
          href="/register"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-full"
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
