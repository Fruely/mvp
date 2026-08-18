"use client";

import { useMemo, useState } from "react";
import { t, type Dictionary } from "@/lib/i18n";
import type { PricingType } from "@/lib/dashboard/services";
import { Button } from "@/components/ui";
import {
  dashboardCheckboxClass,
  dashboardFieldClass,
} from "@/components/dashboard/dashboardStyles";
import {
  isPricingException,
  isValidPublishableServicePricing,
  type PricingException,
} from "@/lib/specialistServices/pricing";

type ServiceFormValues = {
  title: string;
  description: string;
  price_comment: string;
  pricing_type: PricingType;
  price_from: string;
  price_to: string;
  duration_minutes: string;
  pricing_exception: PricingException | "";
};

const DEFAULT_VALUES: ServiceFormValues = {
  title: "",
  description: "",
  price_comment: "",
  pricing_type: "fixed",
  price_from: "",
  price_to: "",
  duration_minutes: "",
  pricing_exception: "",
};

export type ServiceFormSubmitPayload = {
  title: string;
  description: string | null;
  price_comment: string | null;
  pricing_exception: PricingException | null;
  pricing_type: PricingType;
  price_from: number;
  price_to: number | null;
  duration_minutes: number | null;
  requested_active: boolean;
};

/** Inline EUR suffix next to amount inputs (prices are always EUR server-side). */
function euroSuffix() {
  return (
    <span
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none text-sm font-medium text-freuly-text-secondary"
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      €
    </span>
  );
}

function mapApiError(message: string, dict: Dictionary): string {
  if (message === "ACTIVE_PRICE_REQUIRED") {
    return t(dict, "dashboard.servicesEditor.errors.activePriceRequired");
  }
  if (message === "PRICING_EXCEPTION_INVALID") {
    return t(dict, "dashboard.servicesEditor.errors.exceptionInvalid");
  }
  if (message === "PRICING_EXCEPTION_EXPLANATION_REQUIRED") {
    return t(dict, "dashboard.servicesEditor.errors.exceptionExplanationRequired");
  }
  return message;
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
  onSubmit: (payload: ServiceFormSubmitPayload) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  hideActiveToggle?: boolean;
}) {
  const merged = useMemo(
    () => ({ ...DEFAULT_VALUES, ...(initialValues ?? {}) }),
    [initialValues],
  );
  const [values, setValues] = useState<ServiceFormValues>(merged);
  const [error, setError] = useState<string | null>(null);
  const [requestedActive, setRequestedActive] = useState<boolean>(initialIsActive);
  const exceptionMode = isPricingException(values.pricing_exception);

  function updateValue<Key extends keyof ServiceFormValues>(key: Key, value: ServiceFormValues[Key]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const pricingTypeLabel = (type: PricingType): string =>
    t(dict, `dashboard.servicesEditor.pricingType.${type}`);

  function setExceptionMode(enabled: boolean) {
    setValues((prev) => ({
      ...prev,
      pricing_exception: enabled
        ? prev.pricing_exception || "THIRD_PARTY_FUNDED"
        : "",
      price_from: enabled ? "" : prev.price_from,
      price_to: enabled ? "" : prev.price_to,
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const title = values.title.trim();
    const priceComment = values.price_comment.trim() || null;
    const pricingException = exceptionMode ? values.pricing_exception : null;
    const priceFrom = exceptionMode ? 0 : Number(values.price_from);
    const priceTo = exceptionMode
      ? null
      : values.price_to.trim()
        ? Number(values.price_to)
        : null;
    const duration = values.duration_minutes.trim() ? Number(values.duration_minutes) : null;

    if (!title) {
      setError(t(dict, "dashboard.servicesEditor.errors.titleRequired"));
      return;
    }
    if (exceptionMode && !isPricingException(pricingException)) {
      setError(t(dict, "dashboard.servicesEditor.errors.exceptionRequired"));
      return;
    }
    if (!exceptionMode && (!Number.isFinite(priceFrom) || priceFrom < 0)) {
      setError(t(dict, "dashboard.servicesEditor.errors.priceFromInvalid"));
      return;
    }
    if (!exceptionMode && values.pricing_type === "range") {
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
      if (exceptionMode && !priceComment) {
        setError(t(dict, "dashboard.servicesEditor.errors.exceptionExplanationRequired"));
        return;
      }
      const valid = isValidPublishableServicePricing({
        pricing_type: values.pricing_type,
        price_from: priceFrom,
        price_to: priceTo,
        price_comment: priceComment,
        pricing_exception: pricingException,
      });
      if (!valid) {
        setError(t(dict, "dashboard.servicesEditor.errors.activePriceRequired"));
        return;
      }
    }

    await onSubmit({
      title,
      description: values.description.trim() || null,
      price_comment: priceComment,
      pricing_exception: isPricingException(pricingException) ? pricingException : null,
      pricing_type: values.pricing_type,
      price_from: priceFrom,
      price_to: values.pricing_type === "range" && !exceptionMode ? priceTo : null,
      duration_minutes: duration,
      requested_active: requestedActive,
    }).catch((e) => {
      const raw = e instanceof Error ? e.message : t(dict, "dashboard.servicesEditor.errors.saveFailed");
      setError(mapApiError(raw, dict));
    });
  }

  const amountInputClass = `${dashboardFieldClass} h-10 pr-10`;

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-freuly-md border border-freuly-border-default bg-freuly-surface p-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-freuly-text-secondary">
          {t(dict, "dashboard.servicesEditor.field.title")}
        </label>
        <input
          value={values.title}
          onChange={(e) => updateValue("title", e.target.value)}
          className={`${dashboardFieldClass} h-10`}
          placeholder={t(dict, "dashboard.servicesEditor.placeholder.title")}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-freuly-text-secondary">
          {t(dict, "dashboard.servicesEditor.field.description")}
        </label>
        <textarea
          value={values.description}
          onChange={(e) => updateValue("description", e.target.value)}
          rows={3}
          className={dashboardFieldClass}
          placeholder={t(dict, "dashboard.servicesEditor.placeholder.description")}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-freuly-text-secondary">
          {t(dict, "dashboard.servicesEditor.field.pricingType")}
        </label>
        <select
          value={values.pricing_type}
          onChange={(e) => updateValue("pricing_type", e.target.value as PricingType)}
          className={`${dashboardFieldClass} h-10`}
        >
          <option value="fixed">{pricingTypeLabel("fixed")}</option>
          <option value="hourly">{pricingTypeLabel("hourly")}</option>
          <option value="range">{pricingTypeLabel("range")}</option>
        </select>
      </div>

      <label className="flex items-start gap-2 text-sm text-freuly-text-primary">
        <input
          type="checkbox"
          checked={exceptionMode}
          onChange={(e) => setExceptionMode(e.target.checked)}
          className={`${dashboardCheckboxClass} mt-0.5`}
        />
        <span>
          <span className="block font-medium">{t(dict, "dashboard.servicesEditor.field.noFixedPrice")}</span>
          <span className="mt-0.5 block text-xs text-freuly-text-muted">
            {t(dict, "dashboard.servicesEditor.helper.noFixedPrice")}
          </span>
        </span>
      </label>

      {exceptionMode ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-freuly-text-secondary">
            {t(dict, "dashboard.servicesEditor.field.pricingException")}
          </label>
          <select
            value={values.pricing_exception}
            onChange={(e) =>
              updateValue(
                "pricing_exception",
                e.target.value === "AFTER_ASSESSMENT" || e.target.value === "THIRD_PARTY_FUNDED"
                  ? e.target.value
                  : "",
              )
            }
            className={`${dashboardFieldClass} h-10`}
            required
          >
            <option value="THIRD_PARTY_FUNDED">
              {t(dict, "dashboard.servicesEditor.pricingException.THIRD_PARTY_FUNDED")}
            </option>
            <option value="AFTER_ASSESSMENT">
              {t(dict, "dashboard.servicesEditor.pricingException.AFTER_ASSESSMENT")}
            </option>
          </select>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-medium text-freuly-text-secondary">
              {t(dict, "dashboard.servicesEditor.field.priceFrom")}
              <span
                className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-freuly-border-default text-[10px] text-freuly-text-muted"
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
            <label className="mb-1 block text-xs font-medium text-freuly-text-secondary">
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
                className={`${amountInputClass} disabled:bg-freuly-border-subtle`}
              />
              {values.pricing_type === "range" ? euroSuffix() : null}
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-freuly-text-secondary">
          {t(dict, "dashboard.servicesEditor.field.priceComment")}
          {exceptionMode ? " *" : ""}
        </label>
        <textarea
          value={values.price_comment}
          onChange={(e) => updateValue("price_comment", e.target.value)}
          rows={2}
          className={dashboardFieldClass}
          required={exceptionMode}
        />
        <p className="mt-1 text-xs text-freuly-text-muted">
          {exceptionMode
            ? t(dict, "dashboard.servicesEditor.helper.exceptionPriceComment")
            : t(dict, "dashboard.servicesEditor.helper.priceComment")}
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-freuly-text-secondary">
          {t(dict, "dashboard.servicesEditor.field.duration")}
        </label>
        <input
          value={values.duration_minutes}
          onChange={(e) => updateValue("duration_minutes", e.target.value)}
          type="number"
          min="0"
          className={`${dashboardFieldClass} h-10`}
          placeholder="60"
        />
      </div>

      {!hideActiveToggle ? (
        <label className="flex items-center gap-2 text-sm text-freuly-text-primary">
          <input
            type="checkbox"
            checked={requestedActive}
            onChange={(e) => setRequestedActive(e.target.checked)}
            className={dashboardCheckboxClass}
          />
          {t(dict, "dashboard.servicesEditor.field.showInProfile")}
        </label>
      ) : null}

      {error ? <p className="text-sm text-freuly-error">{error}</p> : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" disabled={loading} className="h-10 w-full sm:w-auto">
          {loading ? t(dict, "dashboard.buttons.saving") : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} className="h-10">
            {t(dict, "dashboard.servicesEditor.cancel")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
