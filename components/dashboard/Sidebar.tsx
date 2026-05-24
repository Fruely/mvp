"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { t, type Dictionary } from "@/lib/i18n";

type NavItem = {
  label: string;
  href?: string;
  disabled?: boolean;
  lockedUntilPublished?: boolean;
  /** If true, only exact pathname match highlights this item (used for dashboard home vs `/dashboard/...`). */
  exact?: boolean;
  icon: ReactNode;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function lockedLabel(lang: string): string {
  if (lang === "de") return "Nach Veröffentlichung";
  if (lang === "ua") return "Після публікації";
  return "После публикации";
}

function buildNavItems(lang: string, dict: Dictionary, isPublished: boolean): NavItem[] {
  const base = `/${lang}/specialist/dashboard`;
  const lock = !isPublished;
  return [
  {
    label: t(dict, "dashboard.sidebar.nav.dashboard"),
    href: base,
    exact: true,
    disabled: lock,
    lockedUntilPublished: lock,
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path d="M4 13h6V4H4v9zm10 7h6v-9h-6v9zM4 20h6v-5H4v5zm10-7h6V4h-6v9z" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: t(dict, "dashboard.sidebar.nav.profile"),
    href: `${base}/profile`,
    disabled: lock,
    lockedUntilPublished: lock,
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path
          d="M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0H5z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    label: t(dict, "dashboard.sidebar.nav.leads"),
    href: `${base}/leads`,
    disabled: lock,
    lockedUntilPublished: lock,
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path d="M4 5h16v14H4V5zm2 2v10h12V7H6zm2 2h8v2H8V9zm0 4h5v2H8v-2z" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: t(dict, "dashboard.sidebar.nav.subscription"),
    href: `${base}/subscription`,
    disabled: lock,
    lockedUntilPublished: lock,
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path d="M12 2l2.4 4.9L20 8l-4 3.8.9 5.7-4.9-2.6L7.1 17.5l.9-5.7L4 8l5.6-.8L12 2z" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: t(dict, "dashboard.sidebar.nav.billing"),
    href: `${base}/billing`,
    disabled: lock,
    lockedUntilPublished: lock,
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path
          d="M4 6h16v4H4V6zm0 6h10v8H4v-8zm12 0h4v2h-4v-2zm0 4h4v4h-4v-4z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    label: t(dict, "dashboard.sidebar.nav.services"),
    href: `${base}/services`,
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path d="M7 3h10l1 4H6l1-4zm-2 6h14v12H5V9zm2 2v8h10v-8H7z" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: t(dict, "dashboard.sidebar.nav.videoGuide"),
    href: `${base}/video-guide`,
    disabled: lock,
    lockedUntilPublished: lock,
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path
          d="M4 7.5A2.5 2.5 0 016.5 5h8A2.5 2.5 0 0117 7.5v9a2.5 2.5 0 01-2.5 2.5h-8A2.5 2.5 0 014 16.5v-9zm15.8 1.1A1 1 0 0021 9.5v5a1 1 0 01-1.2.98L18 15.1V8.9l1.8-.3zM10 10.1l3 1.9-3 1.9v-3.8z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    label: t(dict, "dashboard.sidebar.nav.settings"),
    href: `${base}/settings`,
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path d="M19.4 13a7.9 7.9 0 000-2l2-1.5-2-3.5-2.4 1a8 8 0 00-1.7-1L15 2h-6l-.3 3a8 8 0 00-1.7 1l-2.4-1-2 3.5 2 1.5a8 8 0 000 2l-2 1.5 2 3.5 2.4-1a8 8 0 001.7 1L9 22h6l.3-3a8 8 0 001.7-1l2.4 1 2-3.5-2-1.5zM12 15a3 3 0 110-6 3 3 0 010 6z" fill="currentColor" />
      </svg>
    ),
  },
  ];
}

export default function Sidebar({
  dict,
  lang,
  open,
  onClose,
  isPublished,
}: {
  dict: Dictionary;
  lang: string;
  open: boolean;
  onClose: () => void;
  isPublished: boolean;
}) {
  const pathname = usePathname();
  const currentPath = pathname ?? "";
  const lockedBadge = lockedLabel(lang);
  const navItems = useMemo(() => buildNavItems(lang, dict, isPublished), [lang, dict, isPublished]);

  return (
    <>
      <aside className="hidden h-screen w-[240px] shrink-0 border-r border-gray-200 bg-white md:sticky md:top-0 md:block">
        <div className="flex h-16 items-center border-b border-gray-100 px-5">
          <span className="text-base font-semibold text-gray-900">{t(dict, "dashboard.sidebar.brand")}</span>
        </div>
        <nav className="space-y-1 p-3">
          {navItems.map((item) => {
            const isActive = Boolean(
              item.href &&
                (item.exact
                  ? currentPath === item.href
                  : currentPath === item.href || currentPath.startsWith(`${item.href}/`)),
            );
            const baseClass =
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition";
            const stateClass = isActive
              ? "bg-blue-50 text-blue-700"
              : item.disabled
                ? "cursor-not-allowed text-gray-400"
                : "text-gray-700 hover:bg-gray-50 hover:text-gray-900";

            if (!item.href || item.disabled) {
              return (
                <span key={item.href ?? item.label} className={cn(baseClass, stateClass)} title={item.lockedUntilPublished ? lockedBadge : undefined}>
                  <span className="text-current">{item.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.lockedUntilPublished ? (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      {lockedBadge}
                    </span>
                  ) : null}
                </span>
              );
            }

            return (
              <Link key={item.href} href={item.href} className={cn(baseClass, stateClass)}>
                <span className="text-current">{item.icon}</span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {open ? <div className="fixed inset-0 z-40 bg-black/20 md:hidden" onClick={onClose} aria-hidden /> : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[240px] border-r border-gray-200 bg-white transition-transform md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-100 px-5">
          <span className="text-base font-semibold text-gray-900">{t(dict, "dashboard.sidebar.brand")}</span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label={t(dict, "dashboard.sidebar.closeMenu")}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <nav className="space-y-1 p-3">
          {navItems.map((item) => {
            const isActive = Boolean(
              item.href &&
                (item.exact
                  ? currentPath === item.href
                  : currentPath === item.href || currentPath.startsWith(`${item.href}/`)),
            );
            const baseClass =
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition";
            const stateClass = isActive
              ? "bg-blue-50 text-blue-700"
              : item.disabled
                ? "cursor-not-allowed text-gray-400"
                : "text-gray-700 hover:bg-gray-50 hover:text-gray-900";

            if (!item.href || item.disabled) {
              return (
                <span key={item.href ?? item.label} className={cn(baseClass, stateClass)} title={item.lockedUntilPublished ? lockedBadge : undefined}>
                  <span className="text-current">{item.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.lockedUntilPublished ? (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      {lockedBadge}
                    </span>
                  ) : null}
                </span>
              );
            }

            return (
              <Link key={item.href} href={item.href} onClick={onClose} className={cn(baseClass, stateClass)}>
                <span className="text-current">{item.icon}</span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
