"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG } from "@/lib/categories/uncategorizedSpecialistCategory";
import { getCategoryTitle } from "@/lib/getCategoryTitle";
import { t, type Dictionary } from "@/lib/i18n";
import { toCategoryTitleLang } from "@/lib/i18n/toCategoryTitleLang";

export type OnboardingBasicData = {
  name: string;
  category_id: string;
  work_format: "online" | "offline" | "hybrid";
  postal_code: string;
  languages: string[];
};

export type OnboardingCategory = {
  id: string;
  title: string | null;
  title_ru?: string | null;
  title_de?: string | null;
  title_ua?: string | null;
  parent_id: string | null;
  slug: string | null;
};

export type OnboardingPreserveProfileData = {
  about_me: string;
  city: string;
  address: string;
  video_url: string;
  photo_url: string;
  gallery_urls: string[];
  certificate_urls: string[];
};

const LANGUAGE_OPTIONS = ["ru", "uk", "de", "en", "pl"] as const;
const WORK_FORMAT_OPTIONS = ["online", "offline", "hybrid"] as const;

type FormErrors = Partial<Record<"name" | "category_id" | "work_format" | "postal_code" | "languages" | "submit", string>>;

export default function OnboardingBasicForm({
  dict,
  lang,
  baseHref,
  initialData,
  categories,
}: {
  dict: Dictionary;
  lang: string;
  baseHref: string;
  dashboardHref: string;
  initialData: OnboardingBasicData;
  categories: OnboardingCategory[];
  preserveProfileData: OnboardingPreserveProfileData;
}) {
  const router = useRouter();
  const [form, setForm] = useState<OnboardingBasicData>(initialData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === form.category_id),
    [categories, form.category_id],
  );
  const isUncategorizedCategory = selectedCategory?.slug === UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG;
  const needsPostalCode = form.work_format !== "online";

  function validate(): FormErrors {
    const nextErrors: FormErrors = {};
    if (!form.name.trim()) nextErrors.name = t(dict, "dashboard.onboarding.basicForm.nameRequired");
    if (!form.category_id.trim()) {
      nextErrors.category_id = t(dict, "dashboard.onboarding.basicForm.categoryRequired");
    }
    if (!WORK_FORMAT_OPTIONS.includes(form.work_format)) {
      nextErrors.work_format = t(dict, "dashboard.messages.fillRequired");
    }
    if (form.languages.length === 0) {
      nextErrors.languages = t(dict, "dashboard.onboarding.basicForm.languagesRequired");
    }
    if (needsPostalCode && !form.postal_code.trim()) {
      nextErrors.postal_code = t(dict, "dashboard.onboarding.basicForm.postalCodeRequired");
    } else if (needsPostalCode && !/^\d{5}$/.test(form.postal_code.trim())) {
      nextErrors.postal_code = t(dict, "dashboard.onboarding.basicForm.postalCodeInvalid");
    }
    return nextErrors;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category_id: form.category_id.trim() || null,
        work_format: form.work_format,
        postal_code: form.postal_code.trim(),
        languages: form.languages.map((language) => language.trim()).filter(Boolean),
        lang,
      };

      const res = await fetch("/api/specialist/dashboard/save", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setErrors({ submit: t(dict, "dashboard.onboarding.basicForm.saveFailed") });
        return;
      }

      setErrors({});
      router.push(`${baseHref}?step=about`);
      router.refresh();
    } catch {
      setErrors({ submit: t(dict, "dashboard.onboarding.basicForm.saveFailed") });
    } finally {
      setSaving(false);
    }
  }

  function toggleLanguage(code: string, checked: boolean) {
    setForm((prev) => ({
      ...prev,
      languages: checked
        ? Array.from(new Set([...prev.languages, code]))
        : prev.languages.filter((language) => language !== code),
    }));
  }

  const inputClass = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm";
  const errorClass = "text-xs font-medium text-red-600";
  const secondaryLinkClass =
    "inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50";

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          {t(dict, "dashboard.onboarding.stepContent.basic.title")}
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          {t(dict, "dashboard.onboarding.stepContent.basic.body")}
        </p>
      </div>

      <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-gray-700">{t(dict, "dashboard.onboarding.basicForm.nameLabel")}</span>
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            className={inputClass}
          />
          {errors.name ? <p className={errorClass}>{errors.name}</p> : null}
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-gray-700">{t(dict, "dashboard.onboarding.basicForm.categoryLabel")}</span>
          <select
            value={form.category_id}
            onChange={(event) => setForm((prev) => ({ ...prev, category_id: event.target.value }))}
            className={inputClass}
          >
            <option value="">{t(dict, "dashboard.onboarding.basicForm.categoryPlaceholder")}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {getCategoryTitle(category, toCategoryTitleLang(lang))}
              </option>
            ))}
          </select>
          {errors.category_id ? <p className={errorClass}>{errors.category_id}</p> : null}
          {isUncategorizedCategory ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium leading-relaxed text-amber-900">
              {t(dict, "dashboard.onboarding.uncategorizedWarning")}
            </p>
          ) : null}
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-gray-700">{t(dict, "dashboard.onboarding.basicForm.workFormatLabel")}</span>
          <select
            value={form.work_format}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                work_format: event.target.value as OnboardingBasicData["work_format"],
              }))
            }
            className={inputClass}
          >
            <option value="online">{t(dict, "dashboard.workFormat.online")}</option>
            <option value="offline">{t(dict, "dashboard.workFormat.offline")}</option>
            <option value="hybrid">{t(dict, "dashboard.workFormat.hybrid")}</option>
          </select>
          {errors.work_format ? <p className={errorClass}>{errors.work_format}</p> : null}
        </label>

        {needsPostalCode ? (
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-gray-700">
              {t(dict, "dashboard.onboarding.basicForm.postalCodeLabel")}
            </span>
            <input
              value={form.postal_code}
              onChange={(event) => {
                const value = event.target.value.replace(/\D/g, "").slice(0, 5);
                setForm((prev) => ({ ...prev, postal_code: value }));
              }}
              inputMode="numeric"
              pattern="\d{5}"
              maxLength={5}
              className={inputClass}
            />
            {errors.postal_code ? <p className={errorClass}>{errors.postal_code}</p> : null}
          </label>
        ) : null}

        <fieldset className="space-y-2 text-sm">
          <legend className="font-medium text-gray-700">
            {t(dict, "dashboard.onboarding.basicForm.languagesLabel")}
          </legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {LANGUAGE_OPTIONS.map((code) => (
              <label key={code} className="inline-flex cursor-pointer select-none items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={form.languages.includes(code)}
                  onChange={(event) => toggleLanguage(code, event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-800">{t(dict, `dashboard.lang.${code}`)}</span>
              </label>
            ))}
          </div>
          {errors.languages ? <p className={errorClass}>{errors.languages}</p> : null}
        </fieldset>

        {errors.submit ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {errors.submit}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Link href={`${baseHref}?step=welcome`} className={secondaryLinkClass}>
            {t(dict, "dashboard.onboarding.nav.back")}
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving
              ? t(dict, "dashboard.onboarding.basicForm.saving")
              : t(dict, "dashboard.onboarding.basicForm.save")}
          </button>
        </div>
      </form>
    </section>
  );
}
