import Link from "next/link";
import { Metadata } from "next";
import { getDictionary, t, isSupportedLang, type Lang } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Поддержка Freuly",
  description:
    "Свяжитесь с поддержкой Freuly и получите помощь по работе платформы.",
};

export default async function SupportPage({ params }: { params: { lang: string } }) {
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

      <section className="mb-16">
        <h1 className="text-3xl font-bold mb-4">
          {t(dict, "support.title")}
        </h1>

        <p className="text-lg text-gray-600">
          Если у вас возникли вопросы о работе платформы или поиске специалиста —
          мы готовы помочь.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">
          Как связаться с нами
        </h2>

        <p className="text-gray-700 mb-2">
          Напишите нам на email:
        </p>

        <p className="text-blue-600 font-semibold">
          info@freuly.de
        </p>

        <p className="text-gray-700 mt-4">
          Мы стараемся отвечать на сообщения в течение 24 часов.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">
          Частые вопросы
        </h2>

        <p className="text-gray-700 mb-3">
          <b>Как найти специалиста?</b>
        </p>

        <p className="text-gray-700 mb-6">
          Выберите категорию услуг и отправьте заявку через страницу специалиста.
        </p>

        <p className="text-gray-700 mb-3">
          <b>Берёт ли Freuly комиссию?</b>
        </p>

        <p className="text-gray-700 mb-6">
          Нет. Вы договариваетесь со специалистом напрямую.
        </p>

        <p className="text-gray-700 mb-3">
          <b>Как стать специалистом?</b>
        </p>

        <p className="text-gray-700">
          Создайте профиль специалиста и разместите свои услуги.
        </p>
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