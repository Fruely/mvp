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
      <div className="mt-4 flex flex-row flex-wrap gap-4 overflow-hidden pb-1">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="relative flex h-28 w-28 shrink-0 flex-col items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-green-400 via-green-500 to-green-600 text-white shadow-[0_10px_22px_rgba(0,0,0,0.14)] transition [@media(hover:hover)]:hover:scale-[1.03] active:scale-95 before:pointer-events-none before:absolute before:inset-0 before:rounded-3xl before:bg-white/15 before:opacity-40"
        >
          <MessageCircle className="relative z-10" size={34} strokeWidth={2.2} aria-hidden />
          <span className="relative z-10 mt-2 text-center text-xs font-medium">WhatsApp</span>
        </a>
        <a
          href={tgHref}
          target="_blank"
          rel="noopener noreferrer"
          className="relative flex h-28 w-28 shrink-0 flex-col items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-sky-400 via-blue-500 to-blue-600 text-white shadow-[0_10px_22px_rgba(0,0,0,0.14)] transition [@media(hover:hover)]:hover:scale-[1.03] active:scale-95 before:pointer-events-none before:absolute before:inset-0 before:rounded-3xl before:bg-white/15 before:opacity-40"
        >
          <Send className="relative z-10" size={34} strokeWidth={2.2} aria-hidden />
          <span className="relative z-10 mt-2 text-center text-xs font-medium">Telegram</span>
        </a>
      </div>
    </div>
  );
}
