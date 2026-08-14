"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n";
import { publicLinkPrimaryClass } from "@/components/public/publicStyles";
import { isPrivateDashboardPath } from "@/lib/dashboard/isPrivateDashboardPath";

const fallbackDict: Dictionary = {
  "header.nav.pricing": "Тарифи",
  "header.nav.partners": "Партнерам",
  "header.cabinet": "Кабінет",
  "header.joinButton": "Приєднатися до Freuly",
};

type HeaderProps = {
  lang: string;
  dict?: Dictionary;
};

function navLinkClass(isActive: boolean): string {
  return [
    "text-[15px] font-medium transition-colors",
    isActive
      ? "font-semibold text-freuly-primary"
      : "text-freuly-text-secondary hover:text-freuly-text-primary",
  ].join(" ");
}

export default function Header({ lang, dict = fallbackDict }: HeaderProps) {
  const d = dict ?? fallbackDict;
  const pathname = usePathname() ?? "";
  const cabinetHref = `/login?next=${encodeURIComponent(`/${lang}/specialist/dashboard`)}`;
  const disablePrefetch = isPrivateDashboardPath(pathname);

  const navItems = [
    { href: `/${lang}/pricing`, label: t(d, "header.nav.pricing") },
    { href: `/${lang}/partners`, label: t(d, "header.nav.partners") },
    { href: cabinetHref, label: t(d, "header.cabinet"), prefetch: false as const },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-freuly-border-default bg-freuly-surface">
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-freuly-4 sm:px-freuly-6 lg:px-freuly-16">
        <Link href={`/${lang}`} prefetch={disablePrefetch ? false : undefined} className="flex shrink-0 items-center gap-3 transition-opacity hover:opacity-90">
          <span
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-freuly-md bg-freuly-primary"
            aria-hidden
          />
          <span className="text-[20px] font-bold tracking-tight text-freuly-text-primary">FREULY</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => {
            const isActive =
              item.href.startsWith("/login")
                ? pathname.includes("/specialist/dashboard") || pathname === "/login"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.label}
                href={item.href}
                prefetch={
                  "prefetch" in item ? item.prefetch : disablePrefetch ? false : undefined
                }
                className={navLinkClass(isActive)}
              >
                {item.label}
              </Link>
            );
          })}
          <Link href={`/${lang}/become-specialist`} prefetch={disablePrefetch ? false : undefined} className={publicLinkPrimaryClass}>
            {t(d, "header.joinButton")}
          </Link>
        </div>

        <Link href={`/${lang}/become-specialist`} prefetch={disablePrefetch ? false : undefined} className={`${publicLinkPrimaryClass} md:hidden`}>
          {t(d, "header.joinButton")}
        </Link>
      </nav>

      <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-freuly-border-subtle px-freuly-4 py-2.5 md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            prefetch={
              "prefetch" in item ? item.prefetch : disablePrefetch ? false : undefined
            }
            className={navLinkClass(
              item.href.startsWith("/login")
                ? pathname.includes("/specialist/dashboard") || pathname === "/login"
                : pathname === item.href,
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
