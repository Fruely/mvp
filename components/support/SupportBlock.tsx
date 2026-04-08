import { MessageCircle, Send } from "lucide-react";

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
      <div className="mt-4 flex flex-row gap-4">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-green-400 to-green-600 text-white shadow-sm transition hover:scale-[1.03] active:scale-95"
        >
          <MessageCircle className="h-8 w-8" strokeWidth={2} aria-hidden />
          <span className="mt-2 text-center text-xs font-medium">WhatsApp</span>
        </a>
        <a
          href={tgHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-sm transition hover:scale-[1.03] active:scale-95"
        >
          <Send className="h-8 w-8" strokeWidth={2} aria-hidden />
          <span className="mt-2 text-center text-xs font-medium">Telegram</span>
        </a>
      </div>
    </div>
  );
}
