export default function SupportBlock() {
  const waHref =
    "https://wa.me/4916092686432?text=Здравствуйте,%20я%20специалист%20Freuly,%20нужна%20помощь%20с%20кабинетом";
  const tgHref =
    "https://t.me/SheshenyaNataliya?text=Здравствуйте,%20я%20специалист%20Freuly,%20нужна%20помощь%20с%20кабинетом";

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <h3 className="text-base font-semibold text-gray-900">Не получается опубликоваться?</h3>
      <p className="mt-1 text-sm text-gray-600">
        Мы поможем разобраться и довести профиль до публикации.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-green-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-green-700 sm:min-w-[200px] sm:flex-initial"
        >
          WhatsApp
        </a>
        <a
          href={tgHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-blue-700 sm:min-w-[200px] sm:flex-initial"
        >
          Telegram
        </a>
      </div>
    </div>
  );
}
