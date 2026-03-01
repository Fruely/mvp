"use client";

import { useMemo, useState } from "react";
import type { PricingType } from "@/lib/dashboard/services";

type ServiceFormValues = {
  title: string;
  description: string;
  pricing_type: PricingType;
  price_from: string;
  price_to: string;
  currency: string;
  duration_minutes: string;
};

const DEFAULT_VALUES: ServiceFormValues = {
  title: "",
  description: "",
  pricing_type: "fixed",
  price_from: "",
  price_to: "",
  currency: "EUR",
  duration_minutes: "",
};

export default function ServiceForm({
  initialValues,
  initialIsActive = true,
  submitLabel,
  onSubmit,
  onCancel,
  loading = false,
}: {
  initialValues?: Partial<ServiceFormValues>;
  initialIsActive?: boolean;
  submitLabel: string;
  onSubmit: (payload: {
    title: string;
    description: string | null;
    pricing_type: PricingType;
    price_from: number;
    price_to: number | null;
    currency: string;
    duration_minutes: number | null;
    requested_active: boolean;
  }) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const title = values.title.trim();
    const priceFrom = Number(values.price_from);
    const priceTo = values.price_to.trim() ? Number(values.price_to) : null;
    const duration = values.duration_minutes.trim() ? Number(values.duration_minutes) : null;

    if (!title) {
      setError("Введите название услуги");
      return;
    }
    if (!Number.isFinite(priceFrom) || priceFrom < 0) {
      setError("Укажите корректную цену от");
      return;
    }
    if (values.pricing_type === "range") {
      if (priceTo == null || !Number.isFinite(priceTo) || priceTo < priceFrom) {
        setError("Для диапазона цена до должна быть не меньше цены от");
        return;
      }
    }
    if (duration != null && (!Number.isFinite(duration) || duration < 0)) {
      setError("Длительность должна быть положительным числом");
      return;
    }
    if (requestedActive) {
      const hasValidPrice =
        Number.isFinite(priceFrom) &&
        priceFrom >= 0 &&
        (values.pricing_type !== "range" ||
          (priceTo != null && Number.isFinite(priceTo) && priceTo >= priceFrom));
      if (!hasValidPrice) {
        setError("Без указания цены услуга не может быть активирована.");
        return;
      }
    }

    await onSubmit({
      title,
      description: values.description.trim() || null,
      pricing_type: values.pricing_type,
      price_from: priceFrom,
      price_to: values.pricing_type === "range" ? priceTo : null,
      currency: values.currency.trim() || "EUR",
      duration_minutes: duration,
      requested_active: requestedActive,
    }).catch((e) => {
      setError(e instanceof Error ? e.message : "Не удалось сохранить услугу");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Название услуги</label>
        <input
          value={values.title}
          onChange={(e) => updateValue("title", e.target.value)}
          className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          placeholder="Например, Консультация"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Описание</label>
        <textarea
          value={values.description}
          onChange={(e) => updateValue("description", e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          placeholder="Кратко опишите услугу"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Тип цены</label>
          <select
            value={values.pricing_type}
            onChange={(e) => updateValue("pricing_type", e.target.value as PricingType)}
            className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          >
            <option value="fixed">fixed</option>
            <option value="range">range</option>
            <option value="hourly">hourly</option>
          </select>
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-600">
            Цена от
            <span
              className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-gray-300 text-[10px] text-gray-500"
              title="Цена обязательна для публикации профиля. Профили с указанной ценой получают больше заявок и выше доверие клиентов."
              aria-label="Информация о требовании цены"
            >
              i
            </span>
          </label>
          <input
            value={values.price_from}
            onChange={(e) => updateValue("price_from", e.target.value)}
            type="number"
            min="0"
            step="0.01"
            className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Цена до</label>
          <input
            value={values.price_to}
            onChange={(e) => updateValue("price_to", e.target.value)}
            type="number"
            min="0"
            step="0.01"
            disabled={values.pricing_type !== "range"}
            className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Валюта</label>
          <input
            value={values.currency}
            onChange={(e) => updateValue("currency", e.target.value.toUpperCase())}
            className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            placeholder="EUR"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Длительность (мин)</label>
          <input
            value={values.duration_minutes}
            onChange={(e) => updateValue("duration_minutes", e.target.value)}
            type="number"
            min="0"
            className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            placeholder="60"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={requestedActive}
          onChange={(e) => setRequestedActive(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        Активировать услугу
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Сохранение..." : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Отмена
          </button>
        ) : null}
      </div>
    </form>
  );
}

