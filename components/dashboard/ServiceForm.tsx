"use client";

import { useMemo, useState } from "react";
import { t, type Dictionary } from "@/lib/i18n";
import type { PricingType } from "@/lib/dashboard/services";

type ServiceFormValues = {
  title: string;
  description: string;
  price_comment: string;
  pricing_type: PricingType;
  price_from: string;
  price_to: string;
  duration_minutes: string;
};

const DEFAULT_VALUES: ServiceFormValues = {
  title: "",
  description: "",
  price_comment: "",
  pricing_type: "fixed",
  price_from: "",
  price_to: "",
  duration_minutes: "",
};

/** Inline EUR suffix next to amount inputs (prices are always EUR server-side). */
function euroSuffix() {
  return (
    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-sm font-medium text-gray-600">
      €
    </span>
  );
}

export default function ServiceForm({
  dict,
  initialValues,
  initialIsActive = true,
  submitLabel,
  onSubmit,
  onCancel,
  loading = false,
  hideActiveToggle = false,
}: {
  dict: Dictionary;
  initialValues?: Partial<ServiceFormValues>;
  initialIsActive?: boolean;
  submitLabel: string;
  onSubmit: (payload: {
    title: string;
    description: string | null;
    price_comment: string | null;
    pricing_type: PricingType;
    price_from: number;
    price_to: number | null;
    duration_minutes: number | null;
    requested_active: boolean;
  }) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  hideActiveToggle?: boolean;
}) {
  const merged = useMemo(
    () => ({ ...DEFAULT_VALUES, ...(initialValues ?? {}) }),
    [initialValues]
  );
  const [values, setValues] = useState<ServiceFormValues>(merged);
  const [error, setError] = useState<string | null>(null);
  const [requestedActive, setRequestedActive] = useState<boolean>(initialIsActive);

  function updateValue<Key extends keyof ServiceFormValues>(key: Key, value: ServiceFormValues[Key]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const pricingTypeLabel = (type: PricingType): string =>
    t(dict, `dashboard.servicesEditor.pricingType.${type}`);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const title = values.title.trim();
    const priceFrom = Number(values.price_from);
    const priceTo = values.price_to.trim() ? Number(values.price_to) : null;
    const duration = values.duration_minutes.trim() ? Number(values.duration_minutes) : null;

    if (!title) {
      setError(t(dict, "dashboard.servicesEditor.errors.titleRequired"));
      return;
    }
    if (!Number.isFinite(priceFrom) || priceFrom < 0) {
      setError(t(dict, "dashboard.servicesEditor.errors.priceFromInvalid"));
      return;
    }
    if (values.pricing_type === "range") {
      if (priceTo == null || !Number.isFinite(priceTo) || priceTo < priceFrom) {
        setError(t(dict, "dashboard.servicesEditor.errors.priceRangeInvalid"));
        return;
      }
    }
    if (duration != null && (!Number.isFinite(duration) || duration < 0)) {
      setError(t(dict, "dashboard.servicesEditor.errors.durationInvalid"));
      return;
    }
    if (requestedActive) {
      const hasValidPrice =
        Number.isFinite(priceFrom) &&
        priceFrom > 0 &&
        (values.pricing_type !== "range" ||
          (priceTo != null && Number.isFinite(priceTo) && priceTo >= priceFrom));
      if (!hasValidPrice) {
        setError(t(dict, "dashboard.servicesEditor.errors.activePriceRequired"));
        return;
      }
    }

    await onSubmit({
      title,
      description: values.description.trim() || null,
      price_comment: values.price_comment.trim() || null,
      pricing_type: values.pricing_type,
      price_from: priceFrom,
      price_to: values.pricing_type === "range" ? priceTo : null,
      duration_minutes: duration,
      requested_active: requestedActive,
    }).catch((e) => {
      setError(e instanceof Error ? e.message : t(dict, "dashboard.servicesEditor.errors.saveFailed"));
    });
  }

  const amountInputClass =
    "h-10 w-full rounded-lg border border-gray-300 pl-3 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          {t(dict, "dashboard.servicesEditor.field.title")}
        </label>
        <input
          value={values.title}
          onChange={(e) => updateValue("title", e.target.value)}
          className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          placeholder={t(dict, "dashboard.servicesEditor.placeholder.title")}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          {t(dict, "dashboard.servicesEditor.field.description")}
        </label>
        <textarea
          value={values.description}
          onChange={(e) => updateValue("description", e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          placeholder={t(dict, "dashboard.servicesEditor.placeholder.description")}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          {t(dict, "dashboard.servicesEditor.field.priceComment")}
        </label>
        <textarea
          value={values.price_comment}
          onChange={(e) => updateValue("price_comment", e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          {t(dict, "dashboard.servicesEditor.helper.priceComment")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            {t(dict, "dashboard.servicesEditor.field.pricingType")}
          </label>
          <select
            value={values.pricing_type}
            onChange={(e) => updateValue("pricing_type", e.target.value as PricingType)}
            className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          >
            <option value="fixed">{pricingTypeLabel("fixed")}</option>
            <option value="hourly">{pricingTypeLabel("hourly")}</option>
            <option value="range">{pricingTypeLabel("range")}</option>
          </select>
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-600">
            {t(dict, "dashboard.servicesEditor.field.priceFrom")}
            <span
              className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-gray-300 text-[10px] text-gray-500"
              title={t(dict, "dashboard.servicesEditor.priceInfo")}
              aria-label={t(dict, "dashboard.servicesEditor.priceInfo")}
            >
              i
            </span>
          </label>
          <div className="relative">
            <input
              value={values.price_from}
              onChange={(e) => updateValue("price_from", e.target.value)}
              type="number"
              min="0"
              step="0.01"
              className={amountInputClass}
              required
            />
            {euroSuffix()}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            {t(dict, "dashboard.servicesEditor.field.priceTo")}
          </label>
          <div className="relative">
            <input
              value={values.price_to}
              onChange={(e) => updateValue("price_to", e.target.value)}
              type="number"
              min="0"
              step="0.01"
              disabled={values.pricing_type !== "range"}
              className={`${amountInputClass} disabled:bg-gray-100`}
            />
            {values.pricing_type === "range" ? euroSuffix() : null}
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          {t(dict, "dashboard.servicesEditor.field.duration")}
        </label>
        <input
          value={values.duration_minutes}
          onChange={(e) => updateValue("duration_minutes", e.target.value)}
          type="number"
          min="0"
          className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          placeholder="60"
        />
      </div>

      {!hideActiveToggle ? (
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={requestedActive}
            onChange={(e) => setRequestedActive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          {t(dict, "dashboard.servicesEditor.field.showInProfile")}
        </label>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60 sm:w-auto"
        >
          {loading ? t(dict, "dashboard.buttons.saving") : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            {t(dict, "dashboard.servicesEditor.cancel")}
          </button>
        ) : null}
      </div>
    </form>
  );
}
