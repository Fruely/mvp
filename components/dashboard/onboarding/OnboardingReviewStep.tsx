"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { t, type Dictionary } from "@/lib/i18n";

export type OnboardingReviewSummary = {
  publishReady: boolean;
  hasName: boolean;
  hasCategory: boolean;
  hasPublishableCategory: boolean;
  isUncategorizedCategory: boolean;
  isRootCategory: boolean;
  hasLanguages: boolean;
  hasWorkFormat: boolean;
  needsPostalCode: boolean;
  hasValidPostalCodeWhenNeeded: boolean;
  hasActiveServicesAnyCategory: boolean;
  hasValidServiceInSelectedCategory: boolean;
  servicesMismatch: boolean;
  hasAbout: boolean;
  hasPhoto: boolean;
  hasGallery: boolean;
};

type ReviewItem = {
  key: string;
  label: string;
  done: boolean;
  href?: string;
};

function itemStatusClass(done: boolean): string {
  return done ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800";
}

function ReviewList({
  items,
  doneLabel,
}: {
  items: ReviewItem[];
  doneLabel: string;
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.key}
          className="flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-3 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="min-w-0">
            {!item.done && item.href ? (
              <Link href={item.href} className="text-sm font-medium text-blue-700 hover:underline">
                {item.label}
              </Link>
            ) : (
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
            )}
          </div>
          <span className={`w-fit shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${itemStatusClass(item.done)}`}>
            {item.done ? doneLabel : "!"}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function OnboardingReviewStep({
  dict,
  lang,
  baseHref,
  dashboardHref,
  publicProfileHref,
  publishReady,
  summary,
}: {
  dict: Dictionary;
  lang: string;
  baseHref: string;
  dashboardHref: string;
  publicProfileHref: string;
  publishReady: boolean;
  summary: OnboardingReviewSummary;
}) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dashboardLink = dashboardHref || `/${lang}/specialist/dashboard`;
  const servicesHref = `/${lang}/specialist/dashboard/services`;

  const categoryLabel = summary.isUncategorizedCategory
    ? t(dict, "dashboard.onboarding.reviewStep.fixUncategorizedCategory")
    : summary.isRootCategory
      ? t(dict, "dashboard.onboarding.reviewStep.fixRootCategory")
      : t(dict, "dashboard.onboarding.reviewStep.fixCategory");
  const serviceLabel = summary.servicesMismatch
    ? t(dict, "dashboard.onboarding.reviewStep.servicesMismatch")
    : t(dict, "dashboard.onboarding.reviewStep.fixServices");

  const hardItems: ReviewItem[] = [
    {
      key: "name",
      label: t(dict, "dashboard.onboarding.reviewStep.fixName"),
      done: summary.hasName,
      href: `${baseHref}?step=basic`,
    },
    {
      key: "category",
      label: categoryLabel,
      done: summary.hasCategory && summary.hasPublishableCategory,
      href: `${baseHref}?step=basic`,
    },
    {
      key: "languages",
      label: t(dict, "dashboard.onboarding.reviewStep.fixLanguages"),
      done: summary.hasLanguages,
      href: `${baseHref}?step=basic`,
    },
    {
      key: "workFormat",
      label: t(dict, "dashboard.onboarding.reviewStep.fixWorkFormat"),
      done: summary.hasWorkFormat,
      href: `${baseHref}?step=basic`,
    },
    ...(summary.needsPostalCode
      ? [
          {
            key: "postalCode",
            label: t(dict, "dashboard.onboarding.reviewStep.fixPostalCode"),
            done: summary.hasValidPostalCodeWhenNeeded,
            href: `${baseHref}?step=basic`,
          },
        ]
      : []),
    {
      key: "services",
      label: serviceLabel,
      done: summary.hasValidServiceInSelectedCategory,
      href: `${baseHref}?step=services`,
    },
  ];

  const recommendations: ReviewItem[] = [
    {
      key: "about",
      label: t(dict, "dashboard.onboarding.reviewStep.recommendAbout"),
      done: summary.hasAbout,
      href: `${baseHref}?step=about`,
    },
    {
      key: "photo",
      label: t(dict, "dashboard.onboarding.reviewStep.recommendPhoto"),
      done: summary.hasPhoto,
      href: `${baseHref}?step=photos`,
    },
    {
      key: "gallery",
      label: t(dict, "dashboard.onboarding.reviewStep.recommendGallery"),
      done: summary.hasGallery,
    },
  ];

  async function handlePublish() {
    if (published) return;
    if (!publishReady || !summary.publishReady) {
      setError(t(dict, "dashboard.onboarding.reviewStep.preflightError"));
      return;
    }

    setPublishing(true);
    setPublished(false);
    setError(null);

    try {
      const res = await fetch("/api/specialist/dashboard/publish", { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { error?: unknown; fields?: unknown };

      if (!res.ok) {
        const fields = Array.isArray(json.fields) ? json.fields.filter((field) => typeof field === "string").join(", ") : "";
        const message =
          typeof json.error === "string"
            ? json.error
            : t(dict, "dashboard.onboarding.reviewStep.publishFailed");
        setError(fields ? `${message}: ${fields}` : message);
        return;
      }

      setPublished(true);
      router.refresh();
    } catch {
      setError(t(dict, "dashboard.onboarding.reviewStep.publishFailed"));
    } finally {
      setPublishing(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          {t(dict, "dashboard.onboarding.reviewStep.title")}
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          {t(dict, "dashboard.onboarding.reviewStep.body")}
        </p>
      </div>

      {published ? (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-base font-semibold text-emerald-900">
            {t(dict, "dashboard.onboarding.reviewStep.published")}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href={publicProfileHref}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              {t(dict, "dashboard.onboarding.reviewStep.viewProfile")}
            </Link>
            <Link
              href={servicesHref}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-emerald-200 bg-white px-4 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
            >
              {t(dict, "dashboard.onboarding.reviewStep.addService")}
            </Link>
            <Link
              href={`${baseHref}?step=photos`}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-emerald-200 bg-white px-4 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
            >
              {t(dict, "dashboard.onboarding.reviewStep.addPhoto")}
            </Link>
            <Link
              href={dashboardLink}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-emerald-200 bg-white px-4 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
            >
              {t(dict, "dashboard.onboarding.reviewStep.goDashboard")}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div
            className={`mt-5 rounded-lg border px-4 py-3 text-sm ${
              publishReady
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            <p className="font-semibold">
              {publishReady
                ? t(dict, "dashboard.onboarding.reviewStep.readyTitle")
                : t(dict, "dashboard.onboarding.reviewStep.notReadyTitle")}
            </p>
            <p className="mt-1">
              {publishReady
                ? t(dict, "dashboard.onboarding.reviewStep.readyBody")
                : t(dict, "dashboard.onboarding.reviewStep.notReadyBody")}
            </p>
          </div>

          <div className="mt-5 space-y-6">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                {t(dict, "dashboard.onboarding.reviewStep.hardRequirementsTitle")}
              </h3>
              <div className="mt-3">
                <ReviewList
                  items={hardItems}
                  doneLabel={t(dict, "dashboard.onboarding.checklist.done")}
                />
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-gray-900">
                {t(dict, "dashboard.onboarding.reviewStep.recommendationsTitle")}
              </h3>
              <div className="mt-3">
                <ReviewList
                  items={recommendations}
                  doneLabel={t(dict, "dashboard.onboarding.checklist.done")}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href={`${baseHref}?step=photos`}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              {t(dict, "dashboard.onboarding.reviewStep.backToPhoto")}
            </Link>
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing || !publishReady}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {publishing
                ? t(dict, "dashboard.onboarding.reviewStep.publishing")
                : t(dict, "dashboard.onboarding.reviewStep.publish")}
            </button>
          </div>
        </>
      )}

      {error ? (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}
    </section>
  );
}
