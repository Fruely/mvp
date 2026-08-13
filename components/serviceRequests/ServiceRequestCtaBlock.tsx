"use client";

import Link from "next/link";
import { t, type Dictionary, type Lang } from "@/lib/i18n";
import { requestServiceHref } from "@/lib/serviceRequests/requestServiceHref";

type Props = {
  lang: Lang;
  dict: Dictionary;
  variant: "empty" | "fallback";
  categoryId?: string | null;
  categoryText?: string | null;
  sourcePath?: string | null;
};

export default function ServiceRequestCtaBlock({
  lang,
  dict,
  variant,
  categoryId,
  categoryText,
  sourcePath,
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
          ? "mt-8 rounded-xl border border-dashed border-freuly-border-default bg-freuly-border-subtle px-6 py-5 text-center"
          : "mt-10 rounded-xl border border-freuly-border-subtle bg-white px-6 py-5 text-center shadow-sm"
      }
    >
      <p className="text-sm font-medium text-freuly-text-primary">{t(dict, titleKey)}</p>
      <p className="text-sm text-freuly-text-secondary mt-1 mb-4">{t(dict, subtitleKey)}</p>
      <Link
        href={href}
        className="inline-block px-4 py-2 border border-gray-300 text-freuly-text-primary text-sm font-medium rounded-lg hover:bg-freuly-border-subtle transition"
      >
        {t(dict, "serviceRequest.cta.button")}
      </Link>
    </div>
  );
}
