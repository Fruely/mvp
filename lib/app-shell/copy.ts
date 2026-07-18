import type { Lang } from "@/lib/i18n";

/**
 * Parent-category slugs surfaced as quick tiles in the app shell.
 *
 * These are real top-level `categories.slug` values that exist in the DB and
 * have localized titles in all three locales (ua/ru/de). Confirmed against:
 * - supabase/manual_migrations/2026-05-16_homepage_parent_category_slots.sql
 *   (tech-it-support, house-garden, health-psychology join public.categories);
 * - locales/{ua,ru,de}.json `categories.*` parent groups (full label parity).
 * Each tile links to the existing `/{lang}/category/{slug}` route.
 */
export const APP_SHELL_CATEGORY_SLUGS = [
  "health-psychology",
  "beauty-care",
  "house-garden",
  "education-development",
  "tech-it-support",
  "legal-consulting",
  "business-consulting",
  "moving-transport",
] as const;

export type AppShellCategorySlug = (typeof APP_SHELL_CATEGORY_SLUGS)[number];

export type AppShellCopy = {
  languageSwitcherLabel: string;
  heroBadge: string;
  primaryActionTitle: string;
  primaryActionSubtitle: string;
  primaryActionCta: string;
  categoriesTitle: string;
  quickActionsTitle: string;
  nearby: string;
  online: string;
  allCategories: string;
  specialistTitle: string;
  guestSpecialistHint: string;
  guestSpecialistCta: string;
  specialistCabinetCta: string;
  fullSiteLink: string;
};

export const APP_SHELL_COPY: Record<Lang, AppShellCopy> = {
  ua: {
    languageSwitcherLabel: "Мова",
    heroBadge: "Вітаємо у Freuly",
    primaryActionTitle: "Знайдіть спеціаліста",
    primaryActionSubtitle: "Вашою мовою — поруч або онлайн.",
    primaryActionCta: "Знайти спеціаліста",
    categoriesTitle: "Категорії",
    quickActionsTitle: "Швидкі дії",
    nearby: "Знайти поруч",
    online: "Онлайн-послуги",
    allCategories: "Усі категорії",
    specialistTitle: "Для спеціалістів",
    guestSpecialistHint: "Ви спеціаліст?",
    guestSpecialistCta: "Увійти спеціалісту",
    specialistCabinetCta: "Відкрити кабінет",
    fullSiteLink: "Відкрити повну версію сайту",
  },
  ru: {
    languageSwitcherLabel: "Язык",
    heroBadge: "Добро пожаловать в Freuly",
    primaryActionTitle: "Найдите специалиста",
    primaryActionSubtitle: "На вашем языке — рядом или онлайн.",
    primaryActionCta: "Найти специалиста",
    categoriesTitle: "Категории",
    quickActionsTitle: "Быстрые действия",
    nearby: "Найти рядом",
    online: "Онлайн-услуги",
    allCategories: "Все категории",
    specialistTitle: "Для специалистов",
    guestSpecialistHint: "Вы специалист?",
    guestSpecialistCta: "Войти специалисту",
    specialistCabinetCta: "Открыть кабинет",
    fullSiteLink: "Открыть полную версию сайта",
  },
  de: {
    languageSwitcherLabel: "Sprache",
    heroBadge: "Willkommen bei Freuly",
    primaryActionTitle: "Finden Sie einen Spezialisten",
    primaryActionSubtitle: "In Ihrer Sprache — in der Nähe oder online.",
    primaryActionCta: "Spezialisten finden",
    categoriesTitle: "Kategorien",
    quickActionsTitle: "Schnellaktionen",
    nearby: "In der Nähe finden",
    online: "Online-Dienste",
    allCategories: "Alle Kategorien",
    specialistTitle: "Für Spezialisten",
    guestSpecialistHint: "Sind Sie Spezialist?",
    guestSpecialistCta: "Als Spezialist anmelden",
    specialistCabinetCta: "Dashboard öffnen",
    fullSiteLink: "Zur vollständigen Website",
  },
};
