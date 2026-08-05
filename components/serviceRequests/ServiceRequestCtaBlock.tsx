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
          ? "mt-8 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-5 text-center"
          : "mt-10 rounded-xl border border-gray-100 bg-white px-6 py-5 text-center shadow-sm"
      }
    >
      <p className="text-sm font-medium text-gray-800">{t(dict, titleKey)}</p>
      <p className="text-sm text-gray-600 mt-1 mb-4">{t(dict, subtitleKey)}</p>
      <Link
        href={href}
        className="inline-block px-4 py-2 border border-gray-300 text-gray-800 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
      >
        {t(dict, "serviceRequest.cta.button")}
      </Link>
    </div>
  );
}
