/** Russian operational copy for the internal Freuly admin. */

export const ADMIN_BRAND = "Freuly — админка";

export const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Обзор" },
  { href: "/admin/leads", label: "Лиды" },
  { href: "/admin/service-requests", label: "Заявки клиентов" },
  { href: "/admin/specialists", label: "Специалисты" },
  { href: "/admin/partners", label: "Партнёры" },
  { href: "/admin/campaign-links", label: "Рекламные ссылки" },
  { href: "/admin/site-blocks", label: "Блоки сайта" },
  {
    href: "/admin/content/homepage/social-insights",
    label: "Главная / Соцсети",
  },
  { href: "/admin/help", label: "Инструкция" },
] as const;

export const ADMIN_PARTNER_STATUS_LABELS: Record<string, string> = {
  active: "Активен",
  paused: "Приостановлен",
  disabled: "Отключён",
  pending: "Ожидает",
  rejected: "Отклонён",
};

export const ADMIN_PARTNER_STATUS_HELP: Record<string, string> = {
  active:
    "Реферальная ссылка работает, новые переходы учитываются, регистрации могут быть привязаны к партнёру.",
  paused:
    "Реферальная ссылка временно не принимает новые переходы. Ранее выданные cookie по правилам системы могут сохраняться.",
  disabled:
    "Партнёр больше не участвует в программе: ссылка не работает для новых переходов, кабинет партнёра доступен только для просмотра истории.",
  pending: "Партнёр создан, но ещё не активирован для работы по программе.",
  rejected: "Заявка партнёра отклонена.",
};

export const ADMIN_PAYOUT_STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  ready: "Готова к переводу",
  paid: "Выплачено",
  cancelled: "Отменена",
};

export const ADMIN_LINK_TYPES = [
  {
    title: "Реферальная ссылка партнёра",
    example: "https://freuly.de/r/код-партнёра",
    purpose: "Учёт переходов и регистраций специалистов по партнёрской программе.",
  },
  {
    title: "Рекламная ссылка для клиентов",
    example: "https://freuly.de/go/короткий-slug",
    purpose: "Реклама → форма заявки клиента с предзаполнением.",
  },
  {
    title: "Ссылка «Принять заявку»",
    example: "https://freuly.de/ru/request/токен/accept",
    purpose: "Специалист принимает уже созданную продвигаемую заявку.",
  },
] as const;
