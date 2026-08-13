"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { privacyPath } from "@/lib/legal/paths";
import { getDictionary, t, type Dictionary, type Lang } from "@/lib/i18n";
import { Button } from "@/components/ui";
import {
  publicCardClass,
  publicFieldClass,
  publicLinkPrimaryClass,
  publicLinkSecondaryClass,
} from "@/components/public/publicStyles";
import uaDict from "@/locales/ua.json";

type Props = {
  lang: Lang;
  initialCategoryId?: string | null;
  initialCategoryText?: string | null;
  sourcePath?: string | null;
};

const URGENCY_VALUES = [
  "asap",
  "within_24h",
  "within_3_days",
  "within_week",
  "within_month",
  "flexible",
  "specific_date",
] as const;

const WORK_FORMATS = ["online", "offline", "hybrid"] as const;

export default function ServiceRequestForm({
  lang,
  initialCategoryId,
  initialCategoryText,
  sourcePath,
}: Props) {
  const [dict, setDict] = useState<Dictionary>(uaDict as unknown as Dictionary);
  const [client_name, setClientName] = useState("");
  const [client_email, setClientEmail] = useState("");
  const [client_phone, setClientPhone] = useState("");
  const [description, setDescription] = useState("");
  const [preferred_language, setPreferredLanguage] = useState(lang);
  const [work_format, setWorkFormat] = useState<(typeof WORK_FORMATS)[number]>("online");
  const [city, setCity] = useState("");
  const [postal_code, setPostalCode] = useState("");
  const [country_code, setCountryCode] = useState("DE");
  const [radius_km, setRadiusKm] = useState("");
  const [urgency, setUrgency] = useState<(typeof URGENCY_VALUES)[number]>("flexible");
  const [desired_date, setDesiredDate] = useState("");
  const [category_text, setCategoryText] = useState(initialCategoryText ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successPublicId, setSuccessPublicId] = useState<string | null>(null);
  const [hp, setHp] = useState("");

  useEffect(() => {
    let cancelled = false;
    getDictionary(lang)
      .then((d) => {
        if (!cancelled) setDict(d);
      })
      .catch(() => {
        if (!cancelled) setDict(uaDict as unknown as Dictionary);
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const needsLocation = work_format === "offline" || work_format === "hybrid";
  const needsDate = urgency === "specific_date";

  const urgencyOptions = useMemo(
    () =>
      URGENCY_VALUES.map((value) => ({
        value,
        label: t(dict, `serviceRequest.urgency.${value}`),
      })),
    [dict],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!client_name.trim()) {
      setError(t(dict, "serviceRequest.errors.nameRequired"));
      setLoading(false);
      return;
    }
    if (!description.trim()) {
      setError(t(dict, "serviceRequest.errors.descriptionRequired"));
      setLoading(false);
      return;
    }
    if (!client_email.trim() && !client_phone.trim()) {
      setError(t(dict, "serviceRequest.errors.contactRequired"));
      setLoading(false);
      return;
    }
    if (needsLocation && !city.trim() && !postal_code.trim()) {
      setError(t(dict, "serviceRequest.errors.locationRequired"));
      setLoading(false);
      return;
    }
    if (needsDate && !desired_date) {
      setError(t(dict, "serviceRequest.errors.dateRequired"));
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: client_name.trim(),
          client_email: client_email.trim() || null,
          client_phone: client_phone.trim() || null,
          description: description.trim(),
          preferred_language,
          work_format,
          city: city.trim() || null,
          postal_code: postal_code.trim() || null,
          country_code: country_code.trim() || null,
          radius_km: radius_km ? Number(radius_km) : null,
          urgency,
          desired_date: needsDate ? desired_date : null,
          locale: lang,
          category_id: initialCategoryId ?? null,
          category_text: category_text.trim() || null,
          source_path: sourcePath ?? null,
          hp,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; public_id?: string; error?: string };
      if (!res.ok) {
        setError(json.error || t(dict, "serviceRequest.errors.submitFailed"));
        return;
      }
      if (json.public_id) {
        setSuccessPublicId(json.public_id);
      }
    } catch {
      setError(t(dict, "serviceRequest.errors.submitFailed"));
    } finally {
      setLoading(false);
    }
  }

  if (successPublicId) {
    return (
      <div className={`mx-auto max-w-xl p-8 text-center ${publicCardClass}`}>
        <h2 className="mb-3 text-2xl font-bold text-freuly-text-primary">
          {t(dict, "serviceRequest.success.title")}
        </h2>
        <p className="mb-6 text-freuly-text-secondary">{t(dict, "serviceRequest.success.body")}</p>
        <p className="mb-8 text-sm font-medium text-freuly-text-primary">
          {t(dict, "serviceRequest.success.publicIdLabel")}: {successPublicId}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href={`/${lang}/service-search`} className={publicLinkPrimaryClass}>
            {t(dict, "serviceRequest.success.backToSearch")}
          </Link>
          <Link href={`/${lang}`} className={publicLinkSecondaryClass}>
            {t(dict, "serviceRequest.success.backHome")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`mx-auto max-w-xl space-y-5 p-6 sm:p-8 ${publicCardClass}`}
    >
      <input
        type="text"
        name="hp"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-freuly-text-secondary">
          {t(dict, "serviceRequest.fields.name")}
        </label>
        <input
          required
          value={client_name}
          onChange={(e) => setClientName(e.target.value)}
          className={publicFieldClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-freuly-text-secondary">
            {t(dict, "serviceRequest.fields.email")}
          </label>
          <input
            type="email"
            value={client_email}
            onChange={(e) => setClientEmail(e.target.value)}
            className={publicFieldClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-freuly-text-secondary">
            {t(dict, "serviceRequest.fields.phone")}
          </label>
          <input
            type="tel"
            value={client_phone}
            onChange={(e) => setClientPhone(e.target.value)}
            className={publicFieldClass}
          />
        </div>
      </div>
      <p className="text-xs text-freuly-text-muted">{t(dict, "serviceRequest.fields.contactHint")}</p>

      <div>
        <label className="mb-1 block text-sm font-medium text-freuly-text-secondary">
          {t(dict, "serviceRequest.fields.description")}
        </label>
        <textarea
          required
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={publicFieldClass}
        />
      </div>

      {initialCategoryText ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-freuly-text-secondary">
            {t(dict, "serviceRequest.fields.category")}
          </label>
          <input
            value={category_text}
            onChange={(e) => setCategoryText(e.target.value)}
            className={`${publicFieldClass} bg-freuly-border-subtle`}
          />
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-freuly-text-secondary">
            {t(dict, "serviceRequest.fields.language")}
          </label>
          <select
            value={preferred_language}
            onChange={(e) => setPreferredLanguage(e.target.value as Lang)}
            className={publicFieldClass}
          >
            <option value="ru">RU</option>
            <option value="ua">UA</option>
            <option value="de">DE</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-freuly-text-secondary">
            {t(dict, "serviceRequest.fields.workFormat")}
          </label>
          <select
            value={work_format}
            onChange={(e) => setWorkFormat(e.target.value as (typeof WORK_FORMATS)[number])}
            className={publicFieldClass}
          >
            {WORK_FORMATS.map((wf) => (
              <option key={wf} value={wf}>
                {t(dict, `dashboard.workFormat.${wf}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {needsLocation ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-freuly-text-secondary">
              {t(dict, "serviceRequest.fields.city")}
            </label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={publicFieldClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-freuly-text-secondary">
              {t(dict, "serviceRequest.fields.postalCode")}
            </label>
            <input
              value={postal_code}
              onChange={(e) => setPostalCode(e.target.value)}
              className={publicFieldClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-freuly-text-secondary">
              {t(dict, "serviceRequest.fields.radius")}
            </label>
            <input
              type="number"
              min={0}
              value={radius_km}
              onChange={(e) => setRadiusKm(e.target.value)}
              className={publicFieldClass}
            />
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-freuly-text-secondary">
            {t(dict, "serviceRequest.fields.urgency")}
          </label>
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value as (typeof URGENCY_VALUES)[number])}
            className={publicFieldClass}
          >
            {urgencyOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {needsDate ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-freuly-text-secondary">
              {t(dict, "serviceRequest.fields.desiredDate")}
            </label>
            <input
              type="date"
              value={desired_date}
              onChange={(e) => setDesiredDate(e.target.value)}
              className={publicFieldClass}
            />
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-freuly-error">{error}</p> : null}

      <p className="text-xs leading-relaxed text-freuly-text-muted">
        {t(dict, "serviceRequest.privacyNotice.before")}
        <Link href={privacyPath(lang)} className="underline hover:text-freuly-text-secondary">
          {t(dict, "serviceRequest.privacyNotice.link")}
        </Link>
        {t(dict, "serviceRequest.privacyNotice.after")}
      </p>

      <Button type="submit" disabled={loading} className="w-full sm:w-auto">
        {loading ? t(dict, "serviceRequest.submitting") : t(dict, "serviceRequest.submit")}
      </Button>
    </form>
  );
}
