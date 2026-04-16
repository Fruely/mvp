"use client";

import { Fragment, useMemo, useState } from "react";
import ServiceForm from "@/components/dashboard/ServiceForm";
import type { SpecialistService, PricingType } from "@/lib/dashboard/services";
import {
  createService,
  deleteService,
  toggleService,
  updateService,
} from "@/lib/dashboard/services";

function pricingBadgeClass(type: PricingType): string {
  if (type === "fixed") return "bg-blue-50 text-blue-700";
  if (type === "range") return "bg-violet-50 text-violet-700";
  return "bg-emerald-50 text-emerald-700";
}

function formatPrice(service: SpecialistService): string {
  const currency = service.currency || "EUR";
  if (service.pricing_type === "range") {
    return `${service.price_from}–${service.price_to ?? "—"} ${currency}`;
  }
  if (service.pricing_type === "hourly") {
    return `${service.price_from} ${currency}/ч`;
  }
  return `${service.price_from} ${currency}`;
}

function hasValidPrice(service: {
  pricing_type: PricingType;
  price_from: number | null;
  price_to: number | null;
}): boolean {
  if (typeof service.price_from !== "number" || !Number.isFinite(service.price_from)) return false;
  if (service.price_from < 0) return false;
  if (service.pricing_type === "range") {
    if (typeof service.price_to !== "number" || !Number.isFinite(service.price_to)) return false;
    if (service.price_to < service.price_from) return false;
  }
  return true;
}

export default function ServicesTable({
  initialServices,
  lang,
}: {
  initialServices: SpecialistService[];
  lang: string;
}) {
  const [services, setServices] = useState<SpecialistService[]>(initialServices);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyById, setBusyById] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [creating, setCreating] = useState(false);

  const editingService = useMemo(
    () => services.find((service) => service.id === editingId) ?? null,
    [services, editingId]
  );

  async function handleCreate(payload: {
    title: string;
    description: string | null;
    pricing_type: PricingType;
    price_from: number;
    price_to: number | null;
    currency: string;
    duration_minutes: number | null;
    requested_active: boolean;
  }) {
    setCreating(true);
    setToast(null);
    try {
      const shouldBeActive = payload.requested_active && hasValidPrice(payload);
      const created = await createService(
        {
          ...payload,
          is_active: shouldBeActive,
        },
        lang
      );
      setServices((prev) => [created, ...prev]);
      setShowCreate(false);
      setToast({ kind: "success", text: "Услуга добавлена" });
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(
    id: string,
    payload: {
      title: string;
      description: string | null;
      pricing_type: PricingType;
      price_from: number;
      price_to: number | null;
      currency: string;
      duration_minutes: number | null;
      requested_active: boolean;
    }
  ) {
    setBusyById((prev) => ({ ...prev, [id]: true }));
    setToast(null);
    try {
      const shouldBeActive = payload.requested_active && hasValidPrice(payload);
      const updated = await updateService(
        id,
        {
          ...payload,
          is_active: shouldBeActive,
        },
        lang
      );
      setServices((prev) => prev.map((service) => (service.id === id ? updated : service)));
      setEditingId(null);
      setToast({ kind: "success", text: "Услуга обновлена" });
    } finally {
      setBusyById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  async function handleToggle(service: SpecialistService) {
    if (!service.is_active && !hasValidPrice(service)) {
      setToast({
        kind: "error",
        text: "Без указания цены услуга не может быть активирована.",
      });
      return;
    }
    setBusyById((prev) => ({ ...prev, [service.id]: true }));
    setToast(null);
    try {
      const updated = await toggleService(service.id, !service.is_active, lang);
      setServices((prev) => prev.map((item) => (item.id === service.id ? updated : item)));
      setToast({
        kind: "success",
        text: updated.is_active ? "Услуга активирована" : "Услуга деактивирована",
      });
    } catch (e) {
      setToast({
        kind: "error",
        text: e instanceof Error ? e.message : "Не удалось изменить статус услуги",
      });
    } finally {
      setBusyById((prev) => {
        const next = { ...prev };
        delete next[service.id];
        return next;
      });
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Удалить услугу? Это действие нельзя отменить.");
    if (!confirmed) return;

    setBusyById((prev) => ({ ...prev, [id]: true }));
    setToast(null);
    try {
      await deleteService(id);
      setServices((prev) => prev.filter((service) => service.id !== id));
      setToast({ kind: "success", text: "Услуга удалена" });
    } catch (e) {
      setToast({
        kind: "error",
        text: e instanceof Error ? e.message : "Не удалось удалить услугу",
      });
    } finally {
      setBusyById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Услуги и цены</h1>
          <p className="mt-1 text-sm text-gray-500">
            Управляйте списком услуг и ценами для вашей карточки.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowCreate((prev) => !prev);
            setEditingId(null);
          }}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          + Добавить услугу
        </button>
      </div>

      {toast ? (
        <div
          className={`mb-4 rounded-lg px-3 py-2 text-sm ${
            toast.kind === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {toast.text}
        </div>
      ) : null}

      {showCreate ? (
        <div className="mb-5">
          <ServiceForm
            submitLabel="Сохранить услугу"
            loading={creating}
            initialIsActive={true}
            onCancel={() => setShowCreate(false)}
            onSubmit={handleCreate}
          />
        </div>
      ) : null}

      {services.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
          Добавьте первую услугу и цену
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-2 py-2 font-medium">Услуга</th>
                <th className="px-2 py-2 font-medium">Тип</th>
                <th className="px-2 py-2 font-medium">Цена</th>
                <th className="px-2 py-2 font-medium">Длительность</th>
                <th className="px-2 py-2 font-medium">Статус</th>
                <th className="px-2 py-2 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => {
                const busy = Boolean(busyById[service.id]);
                const isEditing = editingId === service.id;
                return (
                  <Fragment key={service.id}>
                    <tr className="border-b border-gray-50 last:border-b-0">
                      <td className="px-2 py-3">
                        <div className="font-medium text-gray-900">{service.title}</div>
                        {service.description ? (
                          <div className="mt-1 max-w-[420px] text-xs text-gray-500">{service.description}</div>
                        ) : null}
                      </td>
                      <td className="px-2 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${pricingBadgeClass(service.pricing_type)}`}>
                          {service.pricing_type}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-gray-800">{formatPrice(service)}</td>
                      <td className="px-2 py-3 text-gray-600">{service.duration_minutes ? `${service.duration_minutes} мин` : "—"}</td>
                      <td className="px-2 py-3">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleToggle(service)}
                          className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-medium transition ${
                            service.is_active
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {service.is_active ? "Активна" : "Отключена"}
                        </button>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId((prev) => (prev === service.id ? null : service.id));
                              setShowCreate(false);
                            }}
                            className="inline-flex h-8 items-center rounded-md border border-gray-300 px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                          >
                            Изменить
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleDelete(service.id)}
                            className="inline-flex h-8 items-center rounded-md border border-red-200 px-3 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                          >
                            Удалить
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isEditing ? (
                      <tr className="border-b border-gray-50">
                        <td colSpan={6} className="px-2 pb-4">
                          <ServiceForm
                            initialValues={{
                              title: service.title,
                              description: service.description ?? "",
                              pricing_type: service.pricing_type,
                              price_from: String(service.price_from ?? ""),
                              price_to: service.price_to == null ? "" : String(service.price_to),
                              currency: service.currency ?? "EUR",
                              duration_minutes:
                                service.duration_minutes == null ? "" : String(service.duration_minutes),
                            }}
                            submitLabel="Сохранить изменения"
                            loading={busy}
                            initialIsActive={service.is_active}
                            onCancel={() => setEditingId(null)}
                            onSubmit={(payload) => handleUpdate(service.id, payload)}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

