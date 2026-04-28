"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  dashboardHref,
  initialData,
  preserveBasicData,
  preserveProfileData,
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
        name: preserveBasicData.name,
        category_id: preserveBasicData.category_id,
        work_format: preserveBasicData.work_format,
        postal_code: preserveBasicData.postal_code,
        languages: preserveBasicData.languages,
        lang,
        about_me: aboutMe.trim(),
        city: preserveProfileData.city,
        address: preserveProfileData.address,
        video_url: preserveProfileData.video_url,
        photo_url: preserveProfileData.photo_url,
        gallery_urls: preserveProfileData.gallery_urls,
        certificate_urls: preserveProfileData.certificate_urls,
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

  const secondaryLinkClass =
    "inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50";

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          {t(dict, "dashboard.onboarding.stepContent.about.title")}
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          {t(dict, "dashboard.onboarding.stepContent.about.body")}
        </p>
      </div>

      <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-gray-700">{t(dict, "dashboard.onboarding.aboutForm.label")}</span>
          <textarea
            value={aboutMe}
            onChange={(event) => setAboutMe(event.target.value)}
            rows={8}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <span className="block text-xs text-gray-500">{t(dict, "dashboard.onboarding.aboutForm.helper")}</span>
        </label>

        {!aboutMe.trim() ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {t(dict, "dashboard.onboarding.aboutForm.emptyWarning")}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Link href={`${baseHref}?step=basic`} className={secondaryLinkClass}>
            {t(dict, "dashboard.onboarding.nav.back")}
          </Link>
          <Link href={dashboardHref} className={secondaryLinkClass}>
            {t(dict, "dashboard.onboarding.nav.dashboard")}
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving
              ? t(dict, "dashboard.onboarding.aboutForm.saving")
              : t(dict, "dashboard.onboarding.aboutForm.save")}
          </button>
        </div>
      </form>
    </section>
  );
}
