"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { t, type Dictionary } from "@/lib/i18n";
import { getDemandChannelCopy } from "@/lib/dashboard/demandChannelCopy";
import type {
  PublicationIssue,
  PublicationRecommendation,
} from "@/lib/dashboard/publicationValidator";
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { dashboardLinkSecondaryClass } from "@/components/dashboard/dashboardStyles";
import { onboardingChecklistItemClass } from "./onboardingStyles";

export type OnboardingReviewSummary = {
  publishReady: boolean;
  blocking: PublicationIssue[];
  recommendations: PublicationRecommendation[];
  hasName: boolean;
  hasCategory: boolean;
  hasPublishableCategory: boolean;
  isUncategorizedCategory: boolean;
  isRootCategory: boolean;
  hasLanguages: boolean;
  hasWorkFormat: boolean;
  hasCountry: boolean;
  hasPostalCode: boolean;
  hasCity: boolean;
  hasCoordinates: boolean;
  needsServiceRadius: boolean;
  hasServiceRadius: boolean;
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
  pendingLabel?: string;
  neutralPending?: boolean;
};

function itemBadgeVariant(done: boolean, neutralPending?: boolean): "success" | "warning" | "neutral" {
  if (done) return "success";
  if (neutralPending) return "neutral";
  return "warning";
}

function ReviewList({ items, doneLabel }: { items: ReviewItem[]; doneLabel: string }) {
  return (
    <div className="space-y-freuly-3">
      {items.map((item) => (
        <div key={item.key} className={onboardingChecklistItemClass}>
          <div className="min-w-0">
            {!item.done && item.href ? (
              <Link href={item.href} className="text-freuly-body-sm font-medium text-freuly-primary hover:underline">
                {item.label}
              </Link>
            ) : (
              <p className="text-freuly-body-sm font-medium text-freuly-text-primary">{item.label}</p>
            )}
          </div>
          <Badge variant={itemBadgeVariant(item.done, item.neutralPending)} className="w-fit shrink-0">
            {item.done ? doneLabel : item.pendingLabel ?? "!"}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function issueLabel(dict: Dictionary, code: string, fallback: string): string {
  const key = `dashboard.messages.${code.startsWith("publication_") ? code : `publication_${code}`}`;
  const translated = t(dict, key);
  if (translated !== key) return translated;
  const alt = t(dict, `dashboard.onboarding.reviewStep.issue.${code}`);
  if (alt !== `dashboard.onboarding.reviewStep.issue.${code}`) return alt;
  return fallback;
}

export default function OnboardingReviewStep({
  dict,
  lang,
  baseHref,
  dashboardHref: _dashboardHref,
  publicProfileHref: _publicProfileHref,
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
  const [error, setError] = useState<string | null>(null);
  const [serverIssues, setServerIssues] = useState<PublicationIssue[]>([]);
  const demandCopy = getDemandChannelCopy(lang);
  const activationLink = `/${lang}/specialist/dashboard/activate`;

  const categoryLabel = summary.isUncategorizedCategory
    ? t(dict, "dashboard.onboarding.reviewStep.fixUncategorizedCategory")
    : summary.isRootCategory
      ? t(dict, "dashboard.onboarding.reviewStep.fixRootCategory")
      : t(dict, "dashboard.onboarding.reviewStep.fixCategory");
  const serviceLabel = summary.servicesMismatch
    ? t(dict, "dashboard.onboarding.reviewStep.servicesMismatch")
    : t(dict, "dashboard.onboarding.reviewStep.fixServices");

  const hardItems: ReviewItem[] = [
    { key: "name", label: t(dict, "dashboard.onboarding.reviewStep.fixName"), done: summary.hasName, href: `${baseHref}?step=basic` },
    { key: "category", label: categoryLabel, done: summary.hasCategory && summary.hasPublishableCategory, href: `${baseHref}?step=basic` },
    { key: "languages", label: t(dict, "dashboard.onboarding.reviewStep.fixLanguages"), done: summary.hasLanguages, href: `${baseHref}?step=basic` },
    { key: "workFormat", label: t(dict, "dashboard.onboarding.reviewStep.fixWorkFormat"), done: summary.hasWorkFormat, href: `${baseHref}?step=basic` },
    { key: "country", label: t(dict, "dashboard.onboarding.reviewStep.fixCountry"), done: summary.hasCountry, href: `${baseHref}?step=basic` },
    { key: "postalCode", label: t(dict, "dashboard.onboarding.reviewStep.fixPostalCodeAll"), done: summary.hasPostalCode, href: `${baseHref}?step=basic` },
    { key: "city", label: t(dict, "dashboard.onboarding.reviewStep.fixCityResolved"), done: summary.hasCity, href: `${baseHref}?step=basic` },
    { key: "coordinates", label: t(dict, "dashboard.onboarding.reviewStep.fixCoordinates"), done: summary.hasCoordinates, href: `${baseHref}?step=basic` },
    ...(summary.needsServiceRadius
      ? [{ key: "serviceRadius", label: t(dict, "dashboard.onboarding.reviewStep.fixServiceRadius"), done: summary.hasServiceRadius, href: `${baseHref}?step=basic` }]
      : []),
    { key: "services", label: serviceLabel, done: summary.hasValidServiceInSelectedCategory, href: `${baseHref}?step=services` },
  ];

  const recommendationPendingLabel = t(dict, "dashboard.onboarding.checklist.recommendation");
  const optionalPendingLabel = t(dict, "dashboard.onboarding.reviewStep.optionalLabel");

  const recommendations: ReviewItem[] = [
    { key: "about", label: t(dict, "dashboard.onboarding.reviewStep.recommendAbout"), done: summary.hasAbout, href: `${baseHref}?step=about`, pendingLabel: recommendationPendingLabel, neutralPending: true },
    { key: "photo", label: t(dict, "dashboard.onboarding.reviewStep.recommendPhoto"), done: summary.hasPhoto, href: `${baseHref}?step=photos`, pendingLabel: recommendationPendingLabel, neutralPending: true },
    { key: "gallery", label: t(dict, "dashboard.onboarding.reviewStep.recommendGallery"), done: summary.hasGallery, pendingLabel: optionalPendingLabel, neutralPending: true },
  ];

  async function handlePublish() {
    if (publishing) return;
    if (!publishReady || !summary.publishReady) {
      setError(t(dict, "dashboard.onboarding.reviewStep.preflightError"));
      setServerIssues(summary.blocking);
      return;
    }

    setPublishing(true);
    setError(null);
    setServerIssues([]);
    let publishSucceeded = false;

    try {
      const res = await fetch("/api/specialist/dashboard/publish", { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as {
        error?: unknown;
        fields?: unknown;
        issues?: PublicationIssue[];
        code?: string;
      };

      if (!res.ok) {
        if (Array.isArray(json.issues) && json.issues.length > 0) {
          setServerIssues(json.issues);
          setError(typeof json.error === "string" ? json.error : t(dict, "dashboard.onboarding.reviewStep.preflightError"));
          return;
        }
        const fields = Array.isArray(json.fields)
          ? json.fields.filter((field) => typeof field === "string").join(", ")
          : "";
        const message = typeof json.error === "string" ? json.error : t(dict, "dashboard.onboarding.reviewStep.publishFailed");
        setError(fields ? `${message}: ${fields}` : message);
        return;
      }

      publishSucceeded = true;
      router.push(activationLink);
    } catch {
      setError(t(dict, "dashboard.onboarding.reviewStep.publishFailed"));
    } finally {
      if (!publishSucceeded) setPublishing(false);
    }
  }

  const visibleIssues = serverIssues.length > 0 ? serverIssues : summary.blocking;

  return (
    <Card padding="lg" className="shadow-none">
      <CardHeader>
        <CardTitle className="text-freuly-card-title">{demandCopy.onboarding.reviewTitle}</CardTitle>
        <p className="mt-freuly-2 max-w-3xl text-freuly-body-sm text-freuly-text-secondary">
          {demandCopy.onboarding.reviewBody}
        </p>
      </CardHeader>

      <CardContent>
        <Alert variant={publishReady ? "success" : "warning"}>
          <p className="font-semibold text-freuly-text-primary">
            {publishReady ? demandCopy.onboarding.reviewReadyTitle : demandCopy.onboarding.reviewNotReadyTitle}
          </p>
          <p className="mt-freuly-1">
            {publishReady ? demandCopy.onboarding.reviewReadyBody : demandCopy.onboarding.reviewNotReadyBody}
          </p>
          {!publishReady && visibleIssues.length > 0 ? (
            <ul className="mt-freuly-2 list-disc space-y-freuly-1 pl-5 text-freuly-helper font-medium">
              {visibleIssues.map((issue) => (
                <li key={`${issue.code}-${issue.field}`}>
                  <Link href={`${baseHref}?step=${issue.step === "services" ? "services" : "basic"}`} className="text-freuly-primary underline">
                    {issueLabel(dict, issue.code, issue.field)}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </Alert>

        {publishReady ? (
          <div className="mt-freuly-5">
            <Button type="button" onClick={handlePublish} disabled={publishing} className="w-full sm:w-auto">
              {publishing ? demandCopy.onboarding.finishingSetup : demandCopy.onboarding.finishSetup}
            </Button>
          </div>
        ) : null}

        {error ? <Alert variant="error" className="mt-freuly-5">{error}</Alert> : null}

        <div className="mt-freuly-5 space-y-freuly-6">
          <div>
            <h3 className="text-freuly-body font-semibold text-freuly-text-primary">{t(dict, "dashboard.onboarding.reviewStep.hardRequirementsTitle")}</h3>
            <div className="mt-freuly-3"><ReviewList items={hardItems} doneLabel={t(dict, "dashboard.onboarding.checklist.done")} /></div>
          </div>

          <div>
            <h3 className="text-freuly-body font-semibold text-freuly-text-primary">{t(dict, "dashboard.onboarding.reviewStep.recommendationsTitle")}</h3>
            <div className="mt-freuly-3"><ReviewList items={recommendations} doneLabel={t(dict, "dashboard.onboarding.checklist.done")} /></div>
          </div>
        </div>

        <div className="mt-freuly-5 flex flex-wrap items-center gap-freuly-3">
          <Link href={`${baseHref}?step=photos`} className={dashboardLinkSecondaryClass}>
            {t(dict, "dashboard.onboarding.reviewStep.backToPhoto")}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
