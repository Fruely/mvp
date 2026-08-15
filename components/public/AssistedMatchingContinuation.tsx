import Link from "next/link";
import type { ReactNode } from "react";
import { publicLinkOutlineClass, publicLinkPrimaryClass } from "@/components/public/publicStyles";

type AssistedMatchingContinuationProps = {
  backHref: string;
  backLabel: string;
  pageTitle: string;
  title: string;
  subtitle: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string | null;
  secondaryLabel?: string | null;
  refineHref?: string | null;
  refineLabel?: string | null;
  extra?: ReactNode;
};

function FreulyMarkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-freuly-primary" aria-hidden>
      <path
        d="M12 3l2.2 6.8H21l-5.5 4 2.1 6.7L12 16.5 6.4 20.5l2.1-6.7L3 9.8h6.8L12 3z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function AssistedMatchingContinuation({
  backHref,
  backLabel,
  pageTitle,
  title,
  subtitle,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  refineHref,
  refineLabel,
  extra,
}: AssistedMatchingContinuationProps) {
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
            <FreulyMarkIcon />
          </div>
          <div className="flex w-full flex-col gap-2.5">
            <h2 className="text-xl font-bold text-freuly-text-primary">{title}</h2>
            <p className="text-sm leading-[1.5] text-freuly-text-secondary">{subtitle}</p>
          </div>
          <Link href={primaryHref} className={`${publicLinkPrimaryClass} w-full min-h-11 px-6 py-3.5 text-[15px]`}>
            {primaryLabel}
          </Link>
          {secondaryHref && secondaryLabel ? (
            <Link
              href={secondaryHref}
              className={`${publicLinkOutlineClass} w-full min-h-11 px-6 py-3.5 text-[15px]`}
            >
              {secondaryLabel}
            </Link>
          ) : null}
        </div>

        {extra}

        {refineHref && refineLabel ? (
          <div className="mt-8 text-center">
            <Link
              href={refineHref}
              className="text-sm font-semibold text-freuly-primary hover:text-freuly-primary-hover"
            >
              {refineLabel}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
