import Link from "next/link";
import type { ReactNode } from "react";
import { publicLinkOutlineClass, publicLinkPrimaryClass } from "@/components/public/publicStyles";

type SearchResultsEmptyStateProps = {
  backHref: string;
  backLabel: string;
  pageTitle: string;
  title: string;
  subtitle?: string;
  primaryHref: string;
  primaryLabel: string;
  adjustTitle?: string;
  changeHref?: string;
  changeLabel?: string;
  extra?: ReactNode;
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-freuly-primary" aria-hidden>
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 16l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function SearchResultsEmptyState({
  backHref,
  backLabel,
  pageTitle,
  title,
  subtitle,
  primaryHref,
  primaryLabel,
  adjustTitle,
  changeHref,
  changeLabel,
  extra,
}: SearchResultsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center bg-freuly-page px-4 py-10 sm:px-6 sm:py-16">
      <div className="w-full max-w-[560px]">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-freuly-primary hover:text-freuly-primary-hover"
        >
          <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0" aria-hidden>
            <path
              d="M7.5 2.5 3.5 6l4 3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {backLabel}
        </Link>
        <h1 className="mt-3 text-[24px] font-bold leading-tight text-freuly-text-primary sm:text-[28px]">
          {pageTitle}
        </h1>

        <div className="mt-6 flex flex-col items-center gap-6 rounded-2xl border border-freuly-border-default bg-freuly-surface p-8 text-center sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-freuly-primary-light">
            <SearchIcon />
          </div>
          <div className="flex w-full flex-col gap-2.5">
            <h2 className="text-xl font-bold text-freuly-text-primary">{title}</h2>
            {subtitle ? (
              <p className="text-sm leading-[1.5] text-freuly-text-secondary">{subtitle}</p>
            ) : null}
          </div>
          <Link href={primaryHref} className={`${publicLinkPrimaryClass} w-full min-h-11 px-6 py-3.5 text-[15px]`}>
            {primaryLabel}
          </Link>
        </div>

        {extra}

        {adjustTitle && changeHref && changeLabel ? (
          <div className="mt-8 text-center">
            <p className="text-sm text-freuly-text-secondary">{adjustTitle}</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
              <Link href={changeHref} className={`${publicLinkOutlineClass} min-h-9 px-5 py-2.5 text-sm`}>
                {changeLabel}
              </Link>
              <Link
                href={backHref}
                className="text-sm font-semibold text-freuly-primary hover:text-freuly-primary-hover"
              >
                {backLabel}
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
