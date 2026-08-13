"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG } from "@/lib/categories/uncategorizedSpecialistCategory";
import { getCategoryTitle } from "@/lib/getCategoryTitle";
import { t, type Dictionary } from "@/lib/i18n";
import { toCategoryTitleLang } from "@/lib/i18n/toCategoryTitleLang";
import {
  GERMANY_COUNTRY_CODE,
  PUBLIC_SERVICE_RADII_KM,
  normalizePostalCode,
} from "@/lib/specialists/geography";
import { needsServiceRadius } from "@/lib/dashboard/publicationValidator";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import {
  dashboardCheckboxClass,
  dashboardFieldClass,
  dashboardLinkSecondaryClass,
} from "@/components/dashboard/dashboardStyles";

export type OnboardingBasicData = {
  name: string;
  category_id: string;
  work_format: "online" | "offline" | "hybrid";
  country_code: string;
  postal_code: string;
  city: string;
  lat: number | null;
  lng: number | null;
  service_radius_km: string;
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

type FormErrors = Partial<
  Record<
    | "name"
    | "category_id"
    | "work_format"
    | "country_code"
    | "postal_code"
    | "location"
    | "service_radius_km"
    | "languages"
    | "submit",
    string
  >
>;

type LocationCandidate = { city: string; lat: number; lng: number };

type ResolveState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "resolved"; candidates: LocationCandidate[]; selectedIndex: number }
  | { status: "error"; reason: string };

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
  const [form, setForm] = useState<OnboardingBasicData>({
    ...initialData,
    country_code: GERMANY_COUNTRY_CODE,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [resolveState, setResolveState] = useState<ResolveState>(() => {
    if (
      initialData.city.trim() &&
      typeof initialData.lat === "number" &&
      typeof initialData.lng === "number"
    ) {
      return {
        status: "resolved",
        candidates: [{ city: initialData.city, lat: initialData.lat, lng: initialData.lng }],
        selectedIndex: 0,
      };
    }
    return { status: "idle" };
  });
  const resolveSeq = useRef(0);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === form.category_id),
    [categories, form.category_id]
  );
  const isUncategorizedCategory = selectedCategory?.slug === UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG;
  const showRadius = needsServiceRadius(form.work_format);

  async function resolvePostal(postalCode: string, opts?: { keepCity?: string }) {
    const seq = ++resolveSeq.current;
    setResolveState({ status: "loading" });
    setForm((prev) => ({
      ...prev,
      city: "",
      lat: null,
      lng: null,
    }));

    try {
      const res = await fetch(
        `/api/specialist/resolve-postal?postal_code=${encodeURIComponent(postalCode)}`
      );
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        code?: string;
        location?: { city?: string; lat?: number; lng?: number };
        candidates?: LocationCandidate[];
      };
      if (seq !== resolveSeq.current) return;

      if (!res.ok || !json.ok) {
        setResolveState({
          status: "error",
          reason: typeof json.code === "string" ? json.code : "not_found",
        });
        return;
      }

      const candidates =
        Array.isArray(json.candidates) && json.candidates.length > 0
          ? json.candidates.filter(
              (c) =>
                typeof c.city === "string" &&
                typeof c.lat === "number" &&
                typeof c.lng === "number"
            )
          : json.location?.city &&
              typeof json.location.lat === "number" &&
              typeof json.location.lng === "number"
            ? [
                {
                  city: json.location.city,
                  lat: json.location.lat,
                  lng: json.location.lng,
                },
              ]
            : [];

      if (candidates.length === 0) {
        setResolveState({ status: "error", reason: "geocode_failed" });
        return;
      }

      let selectedIndex = 0;
      if (opts?.keepCity) {
        const idx = candidates.findIndex(
          (c) => c.city.toLowerCase() === opts.keepCity!.toLowerCase()
        );
        if (idx >= 0) selectedIndex = idx;
      }

      const selected = candidates[selectedIndex];
      setForm((prev) => ({
        ...prev,
        country_code: GERMANY_COUNTRY_CODE,
        city: selected.city,
        lat: selected.lat,
        lng: selected.lng,
      }));
      setResolveState({ status: "resolved", candidates, selectedIndex });
      setErrors((prev) => ({ ...prev, postal_code: undefined, location: undefined }));
    } catch {
      if (seq !== resolveSeq.current) return;
      setResolveState({ status: "error", reason: "geocode_failed" });
    }
  }

  useEffect(() => {
    const plz = normalizePostalCode(form.postal_code);
    if (!plz) {
      setResolveState({ status: "idle" });
      return;
    }
    if (
      resolveState.status === "resolved" &&
      form.city &&
      form.lat != null &&
      form.lng != null &&
      normalizePostalCode(form.postal_code) === plz
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      void resolvePostal(plz);
    }, 400);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce on PLZ only
  }, [form.postal_code]);

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
    if (form.country_code !== GERMANY_COUNTRY_CODE) {
      nextErrors.country_code = t(dict, "dashboard.messages.publication_country_not_supported");
    }
    if (!normalizePostalCode(form.postal_code)) {
      nextErrors.postal_code = t(dict, "dashboard.onboarding.basicForm.postalCodeInvalid");
    }
    if (resolveState.status !== "resolved" || !form.city.trim() || form.lat == null || form.lng == null) {
      nextErrors.location = t(dict, "dashboard.onboarding.basicForm.locationRequired");
    }
    if (showRadius) {
      const n = Number(form.service_radius_km);
      if (!(PUBLIC_SERVICE_RADII_KM as readonly number[]).includes(n)) {
        nextErrors.service_radius_km = t(
          dict,
          "dashboard.messages.publication_service_radius_invalid"
        );
      }
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
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        category_id: form.category_id.trim() || null,
        work_format: form.work_format,
        country_code: GERMANY_COUNTRY_CODE,
        postal_code: normalizePostalCode(form.postal_code),
        city: form.city.trim(),
        lat: form.lat,
        lng: form.lng,
        languages: form.languages.map((language) => language.trim()).filter(Boolean),
        lang,
      };
      if (showRadius) {
        payload.service_radius_km = Number(form.service_radius_km);
      } else {
        payload.service_radius_km = null;
      }

      const res = await fetch("/api/specialist/dashboard/save", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
        const code = typeof json.code === "string" ? json.code : "";
        if (code.startsWith("publication_") || code.includes("postal") || code.includes("geo")) {
          setErrors({
            location:
              t(dict, `dashboard.messages.${code}`, {
                defaultValue: t(dict, "dashboard.onboarding.basicForm.locationRequired"),
              }) || t(dict, "dashboard.onboarding.basicForm.locationRequired"),
          });
        } else {
          setErrors({ submit: t(dict, "dashboard.onboarding.basicForm.saveFailed") });
        }
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

  function selectCandidate(index: number) {
    if (resolveState.status !== "resolved") return;
    const selected = resolveState.candidates[index];
    if (!selected) return;
    setForm((prev) => ({
      ...prev,
      city: selected.city,
      lat: selected.lat,
      lng: selected.lng,
    }));
    setResolveState({ ...resolveState, selectedIndex: index });
  }

  const inputClass = dashboardFieldClass;
  const errorClass = "text-freuly-helper font-medium text-freuly-error";
  const secondaryLinkClass = dashboardLinkSecondaryClass;

  return (
    <Card padding="lg" className="shadow-none">
      <CardHeader>
        <CardTitle className="text-freuly-card-title">
          {t(dict, "dashboard.onboarding.stepContent.basic.title")}
        </CardTitle>
        <p className="mt-freuly-2 max-w-3xl text-freuly-body-sm text-freuly-text-secondary">
          {t(dict, "dashboard.onboarding.stepContent.basic.body")}
        </p>
      </CardHeader>

      <CardContent>
      <form className="space-y-freuly-5" onSubmit={handleSubmit}>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-freuly-text-primary">
            {t(dict, "dashboard.onboarding.basicForm.nameLabel")}
          </span>
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            className={inputClass}
          />
          {errors.name ? <p className={errorClass}>{errors.name}</p> : null}
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-freuly-text-primary">
            {t(dict, "dashboard.onboarding.basicForm.categoryLabel")}
          </span>
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
            <p className="rounded-lg border border-freuly-warning-border bg-freuly-warning-light px-freuly-3 py-freuly-2 text-freuly-helper font-medium leading-relaxed text-freuly-warning">
              {t(dict, "dashboard.onboarding.uncategorizedWarning")}
            </p>
          ) : null}
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-freuly-text-primary">
            {t(dict, "dashboard.onboarding.basicForm.workFormatLabel")}
          </span>
          <select
            value={form.work_format}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                work_format: event.target.value as OnboardingBasicData["work_format"],
                service_radius_km:
                  event.target.value === "online" ? "" : prev.service_radius_km,
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

        <div className="space-y-3 rounded-xl border border-freuly-primary/15 bg-freuly-primary-light/40 p-4">
          <p className="text-sm font-semibold text-gray-900">
            {t(dict, "dashboard.onboarding.basicForm.locationSectionTitle")}
          </p>
          <p className="text-xs leading-relaxed text-gray-600">
            {t(dict, "dashboard.onboarding.basicForm.locationSectionHint")}
          </p>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-freuly-text-primary">
              {t(dict, "dashboard.fields.country")} <span className="text-red-500">*</span>
            </span>
            <select value={GERMANY_COUNTRY_CODE} disabled className={`${inputClass} bg-freuly-border-subtle`}>
              <option value={GERMANY_COUNTRY_CODE}>{t(dict, "dashboard.country.DE")}</option>
            </select>
            <p className="text-freuly-helper text-freuly-text-muted">
              {t(dict, "dashboard.onboarding.basicForm.germanyOnlyHint")}
            </p>
            {errors.country_code ? <p className={errorClass}>{errors.country_code}</p> : null}
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-freuly-text-primary">
              {t(dict, "dashboard.onboarding.basicForm.postalCodeLabel")}{" "}
              <span className="text-red-500">*</span>
            </span>
            <input
              value={form.postal_code}
              onChange={(event) => {
                const value = event.target.value.replace(/\D/g, "").slice(0, 5);
                setForm((prev) => ({
                  ...prev,
                  postal_code: value,
                  city: "",
                  lat: null,
                  lng: null,
                }));
                setResolveState({ status: "idle" });
              }}
              inputMode="numeric"
              pattern="\d{5}"
              maxLength={5}
              className={inputClass}
              autoComplete="postal-code"
            />
            {errors.postal_code ? <p className={errorClass}>{errors.postal_code}</p> : null}
          </label>

          {resolveState.status === "loading" ? (
            <p className="text-xs font-medium text-freuly-primary">
              {t(dict, "dashboard.onboarding.basicForm.locationResolving")}
            </p>
          ) : null}

          {resolveState.status === "error" ? (
            <div className="rounded-lg border border-freuly-warning-border bg-freuly-warning-light px-freuly-3 py-freuly-2 text-freuly-helper text-freuly-text-primary">
              <p className="font-medium">
                {t(dict, "dashboard.onboarding.basicForm.locationResolveFailed")}
              </p>
              <button
                type="button"
                className="mt-2 font-semibold text-freuly-primary underline"
                onClick={() => {
                  const plz = normalizePostalCode(form.postal_code);
                  if (plz) void resolvePostal(plz);
                }}
              >
                {t(dict, "dashboard.onboarding.basicForm.locationRetry")}
              </button>
            </div>
          ) : null}

          {resolveState.status === "resolved" ? (
            <div className="space-y-2">
              {resolveState.candidates.length > 1 ? (
                <label className="block space-y-1 text-sm">
                  <span className="font-medium text-freuly-text-primary">
                    {t(dict, "dashboard.onboarding.basicForm.citySelectLabel")}
                  </span>
                  <select
                    value={String(resolveState.selectedIndex)}
                    onChange={(e) => selectCandidate(Number(e.target.value))}
                    className={inputClass}
                  >
                    {resolveState.candidates.map((c, idx) => (
                      <option key={`${c.city}-${idx}`} value={String(idx)}>
                        {c.city}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                  <span className="font-semibold">
                    {t(dict, "dashboard.onboarding.basicForm.locationFound")}
                  </span>{" "}
                  {form.city}
                </p>
              )}
            </div>
          ) : null}

          {errors.location ? <p className={errorClass}>{errors.location}</p> : null}
        </div>

        {showRadius ? (
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-freuly-text-primary">
              {t(dict, "dashboard.fields.serviceRadius")} <span className="text-red-500">*</span>
            </span>
            <select
              value={
                (PUBLIC_SERVICE_RADII_KM as readonly number[]).includes(
                  Number(form.service_radius_km)
                )
                  ? form.service_radius_km
                  : ""
              }
              onChange={(e) =>
                setForm((prev) => ({ ...prev, service_radius_km: e.target.value }))
              }
              className={inputClass}
            >
              <option value="">{t(dict, "dashboard.fields.serviceRadiusPlaceholder")}</option>
              {PUBLIC_SERVICE_RADII_KM.map((km) => (
                <option key={km} value={String(km)}>
                  {km} km
                </option>
              ))}
            </select>
            <p className="text-freuly-helper text-freuly-text-muted">{t(dict, "dashboard.fields.serviceRadiusHint")}</p>
            {errors.service_radius_km ? (
              <p className={errorClass}>{errors.service_radius_km}</p>
            ) : null}
          </label>
        ) : null}

        <fieldset className="space-y-2 text-sm">
          <legend className="font-medium text-freuly-text-primary">
            {t(dict, "dashboard.onboarding.basicForm.languagesLabel")}
          </legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {LANGUAGE_OPTIONS.map((code) => (
              <label key={code} className="inline-flex cursor-pointer select-none items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={form.languages.includes(code)}
                  onChange={(event) => toggleLanguage(code, event.target.checked)}
                  className={dashboardCheckboxClass}
                />
                <span className="text-freuly-text-primary">{t(dict, `dashboard.lang.${code}`)}</span>
              </label>
            ))}
          </div>
          {errors.languages ? <p className={errorClass}>{errors.languages}</p> : null}
        </fieldset>

        {errors.submit ? (
          <Alert variant="error">{errors.submit}</Alert>
        ) : null}

        <div className="flex flex-wrap items-center gap-freuly-3">
          <Link href={`${baseHref}?step=welcome`} className={secondaryLinkClass}>
            {t(dict, "dashboard.onboarding.nav.back")}
          </Link>
          <Button type="submit" disabled={saving || resolveState.status === "loading"}>
            {saving
              ? t(dict, "dashboard.onboarding.basicForm.saving")
              : t(dict, "dashboard.onboarding.basicForm.save")}
          </Button>
        </div>
      </form>
      </CardContent>
    </Card>
  );
}
