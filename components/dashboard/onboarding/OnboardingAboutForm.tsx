"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Textarea } from "@/components/ui";
import { dashboardLinkSecondaryClass } from "@/components/dashboard/dashboardStyles";
import { t, type Dictionary } from "@/lib/i18n";
import type { OnboardingBasicData, OnboardingPreserveProfileData } from "./OnboardingBasicForm";

export type OnboardingAboutData = {
  about_me: string;
};

type PreserveBasicData = Omit<OnboardingBasicData, "category_id"> & {
  category_id: string | null;
};

type PreserveProfileData = Omit<OnboardingPreserveProfileData, "about_me">;

export default function OnboardingAboutForm({
  dict,
  lang,
  baseHref,
  initialData,
}: {
  dict: Dictionary;
  lang: string;
  baseHref: string;
  dashboardHref: string;
  initialData: OnboardingAboutData;
  preserveBasicData: PreserveBasicData;
  preserveProfileData: PreserveProfileData;
}) {
  const router = useRouter();
  const [aboutMe, setAboutMe] = useState(initialData.about_me);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const payload = {
        lang,
        about_me: aboutMe.trim(),
      };

      const res = await fetch("/api/specialist/dashboard/save", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setError(t(dict, "dashboard.onboarding.aboutForm.saveFailed"));
        return;
      }

      router.push(`${baseHref}?step=services`);
      router.refresh();
    } catch {
      setError(t(dict, "dashboard.onboarding.aboutForm.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card padding="lg" className="shadow-none">
      <CardHeader>
        <CardTitle className="text-freuly-card-title">
          {t(dict, "dashboard.onboarding.stepContent.about.title")}
        </CardTitle>
        <p className="mt-freuly-2 max-w-3xl text-freuly-body-sm text-freuly-text-secondary">
          {t(dict, "dashboard.onboarding.stepContent.about.body")}
        </p>
      </CardHeader>

      <CardContent>
        <form className="space-y-freuly-5" onSubmit={handleSubmit}>
          <Textarea
            id="onboarding-about"
            label={t(dict, "dashboard.onboarding.aboutForm.label")}
            value={aboutMe}
            onChange={(event) => setAboutMe(event.target.value)}
            rows={8}
            helperText={t(dict, "dashboard.onboarding.aboutForm.helper")}
          />

          {!aboutMe.trim() ? (
            <Alert variant="warning">{t(dict, "dashboard.onboarding.aboutForm.emptyWarning")}</Alert>
          ) : null}

          {error ? <Alert variant="error">{error}</Alert> : null}

          <div className="flex flex-wrap items-center gap-freuly-3">
            <Link href={`${baseHref}?step=basic`} className={dashboardLinkSecondaryClass}>
              {t(dict, "dashboard.onboarding.nav.back")}
            </Link>
            <Button type="submit" disabled={saving}>
              {saving
                ? t(dict, "dashboard.onboarding.aboutForm.saving")
                : t(dict, "dashboard.onboarding.aboutForm.save")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
