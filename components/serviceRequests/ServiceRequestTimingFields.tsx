"use client";

import { useMemo } from "react";
import { t, type Dictionary } from "@/lib/i18n";
import { publicFieldClass } from "@/components/public/publicStyles";
import {
  SERVICE_TIMING_PERIODS,
  SERVICE_TIMING_TYPES,
  type ServiceTimingPeriod,
  type ServiceTimingType,
} from "@/lib/serviceRequests/serviceTiming";

export type ServiceTimingFormValue = {
  service_timing_type: ServiceTimingType;
  service_timing_date: string;
  service_timing_time: string;
  service_timing_date_end: string;
  service_timing_period: ServiceTimingPeriod | "";
  service_timing_note: string;
};

type Props = {
  dict: Dictionary;
  value: ServiceTimingFormValue;
  onChange: (next: ServiceTimingFormValue) => void;
};

const DEFAULT_VALUE: ServiceTimingFormValue = {
  service_timing_type: "asap",
  service_timing_date: "",
  service_timing_time: "",
  service_timing_date_end: "",
  service_timing_period: "",
  service_timing_note: "",
};

export function createDefaultServiceTimingFormValue(): ServiceTimingFormValue {
  return { ...DEFAULT_VALUE };
}

export default function ServiceRequestTimingFields({ dict, value, onChange }: Props) {
  const typeOptions = useMemo(
    () =>
      SERVICE_TIMING_TYPES.map((type) => ({
        value: type,
        label: t(dict, `serviceRequest.timing.type.${type}`),
      })),
    [dict],
  );

  const periodOptions = useMemo(
    () =>
      SERVICE_TIMING_PERIODS.map((period) => ({
        value: period,
        label: t(dict, `serviceRequest.timing.period.${period}`),
      })),
    [dict],
  );

  function setType(type: ServiceTimingType) {
    onChange({
      ...value,
      service_timing_type: type,
      service_timing_date: "",
      service_timing_time: "",
      service_timing_date_end: "",
      service_timing_period: "",
    });
  }

  return (
    <fieldset className="space-y-3 rounded-xl border border-freuly-border-default bg-freuly-surface/50 p-4">
      <legend className="px-1 text-sm font-semibold text-freuly-text-primary">
        {t(dict, "serviceRequest.timing.legend")}
      </legend>
      <p className="text-xs text-freuly-text-muted">{t(dict, "serviceRequest.timing.hint")}</p>

      <div className="grid gap-2 sm:grid-cols-2">
        {typeOptions.map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${
              value.service_timing_type === opt.value
                ? "border-freuly-primary bg-freuly-primary-light/40"
                : "border-freuly-border-default hover:border-freuly-primary/30"
            }`}
          >
            <input
              type="radio"
              name="service_timing_type"
              className="mt-0.5"
              checked={value.service_timing_type === opt.value}
              onChange={() => setType(opt.value)}
            />
            <span className="text-freuly-text-primary">{opt.label}</span>
          </label>
        ))}
      </div>

      {value.service_timing_type === "exact_datetime" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-freuly-text-secondary">
              {t(dict, "serviceRequest.timing.fields.date")}
            </label>
            <input
              type="date"
              required
              value={value.service_timing_date}
              onChange={(e) => onChange({ ...value, service_timing_date: e.target.value })}
              className={publicFieldClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-freuly-text-secondary">
              {t(dict, "serviceRequest.timing.fields.time")}
            </label>
            <input
              type="time"
              required
              value={value.service_timing_time}
              onChange={(e) => onChange({ ...value, service_timing_time: e.target.value })}
              className={publicFieldClass}
            />
          </div>
        </div>
      ) : null}

      {value.service_timing_type === "date_flexible" ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-freuly-text-secondary">
            {t(dict, "serviceRequest.timing.fields.date")}
          </label>
          <input
            type="date"
            required
            value={value.service_timing_date}
            onChange={(e) => onChange({ ...value, service_timing_date: e.target.value })}
            className={publicFieldClass}
          />
        </div>
      ) : null}

      {value.service_timing_type === "date_range" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-freuly-text-secondary">
              {t(dict, "serviceRequest.timing.fields.dateFrom")}
            </label>
            <input
              type="date"
              required
              value={value.service_timing_date}
              onChange={(e) => onChange({ ...value, service_timing_date: e.target.value })}
              className={publicFieldClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-freuly-text-secondary">
              {t(dict, "serviceRequest.timing.fields.dateTo")}
            </label>
            <input
              type="date"
              required
              value={value.service_timing_date_end}
              onChange={(e) => onChange({ ...value, service_timing_date_end: e.target.value })}
              className={publicFieldClass}
            />
          </div>
        </div>
      ) : null}

      {value.service_timing_type === "flexible_period" ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-freuly-text-secondary">
            {t(dict, "serviceRequest.timing.fields.period")}
          </label>
          <select
            required
            value={value.service_timing_period}
            onChange={(e) =>
              onChange({
                ...value,
                service_timing_period: e.target.value as ServiceTimingPeriod,
              })
            }
            className={publicFieldClass}
          >
            <option value="">{t(dict, "serviceRequest.timing.fields.periodPlaceholder")}</option>
            {periodOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <label className="mb-1 block text-sm font-medium text-freuly-text-secondary">
          {t(dict, "serviceRequest.timing.fields.note")}
        </label>
        <input
          type="text"
          value={value.service_timing_note}
          onChange={(e) => onChange({ ...value, service_timing_note: e.target.value })}
          placeholder={t(dict, "serviceRequest.timing.fields.notePlaceholder")}
          className={publicFieldClass}
        />
      </div>
    </fieldset>
  );
}
