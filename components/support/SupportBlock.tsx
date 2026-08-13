import { MessageCircle, Send } from "lucide-react";
import { dashboardLinkSecondaryClass } from "@/components/dashboard/dashboardStyles";

export default function SupportBlock() {
  const waHref =
    "https://wa.me/4916092686432?text=Здравствуйте,%20я%20специалист%20Freuly,%20нужна%20помощь%20с%20кабинетом";
  const tgHref =
    "https://t.me/SheshenyaNataliya?text=Здравствуйте,%20я%20специалист%20Freuly,%20нужна%20помощь%20с%20кабинетом";

  const channelLinkClass = `${dashboardLinkSecondaryClass} min-h-[44px] gap-2 px-4`;

  return (
    <div className="rounded-freuly-card border border-freuly-border-default bg-freuly-border-subtle p-freuly-4">
      <h3 className="text-base font-semibold text-freuly-text-primary">Не получается опубликоваться?</h3>
      <p className="mt-1 text-sm text-freuly-text-secondary">
        Мы поможем разобраться и довести профиль до публикации.
      </p>
      <div className="mt-4 flex flex-row flex-wrap gap-3">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className={channelLinkClass}
        >
          <MessageCircle size={18} strokeWidth={2.2} aria-hidden />
          WhatsApp
        </a>
        <a
          href={tgHref}
          target="_blank"
          rel="noopener noreferrer"
          className={channelLinkClass}
        >
          <Send size={18} strokeWidth={2.2} aria-hidden />
          Telegram
        </a>
      </div>
    </div>
  );
}
