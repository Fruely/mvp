"use client";

import Link from "next/link";
import { t, type Dictionary, type Lang } from "@/lib/i18n";
import { requestServiceHref } from "@/lib/serviceRequests/requestServiceHref";
import { publicLinkOutlineClass } from "@/components/public/publicStyles";

type Props = {
  lang: Lang;
  dict: Dictionary;
  variant: "empty" | "fallback";
  categoryId?: string | null;
  categoryText?: string | null;
  sourcePath?: string | null;
  returnHref?: string | null;
};

export default function ServiceRequestCtaBlock({
  lang,
  dict,
  variant,
  categoryId,
  categoryText,
  sourcePath,
  returnHref,
}: Props) {
  const href = requestServiceHref(lang, {
    category_id: categoryId,
    category_text: categoryText,
    source_path: sourcePath,
  });
  const titleKey =
    variant === "empty" ? "serviceRequest.cta.emptyTitle" : "serviceRequest.cta.fallbackTitle";
  const subtitleKey =
    variant === "empty" ? "serviceRequest.cta.emptySubtitle" : "serviceRequest.cta.fallbackSubtitle";

  return (
    <div
      className={
        variant === "empty"
          ? "mt-8 rounded-2xl border border-dashed border-freuly-border-default bg-freuly-surface px-6 py-6 text-left sm:px-8 sm:py-8"
          : "mt-8 rounded-2xl border-[1.5px] border-dashed border-freuly-border-default bg-freuly-surface p-6 text-left sm:p-8"
      }
    >
      <p className="text-lg font-bold text-freuly-text-primary">{t(dict, titleKey)}</p>
      <p className="mt-2 text-sm text-freuly-text-secondary">{t(dict, subtitleKey)}</p>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Link href={href} className={`${publicLinkOutlineClass} min-h-[41px] px-6 py-3`}>
          {t(dict, "serviceRequest.cta.button")}
        </Link>
        {returnHref ? (
          <Link
            href={returnHref}
            className="text-sm font-semibold text-freuly-primary hover:text-freuly-primary-hover"
          >
            {t(dict, "search.results.backToSearch")}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
