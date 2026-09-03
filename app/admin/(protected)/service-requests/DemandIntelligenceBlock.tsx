"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FULFILLMENT_STATUSES,
  SPECIALIST_ACQUISITION_STATUSES,
  type ServiceRequestDetail,
} from "@/lib/serviceRequests/adminData";
import { updateServiceRequestDemandAction } from "./actions";

type Props = { detail: ServiceRequestDetail };

function eurosToCents(value: string): number | null {
  if (!value.trim()) return null;
  const normalized = value.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

function centsToEuros(value: number | null): string {
  return value == null ? "" : (value / 100).toFixed(2);
}

export default function DemandIntelligenceBlock({ detail }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    subcategory_text: detail.subcategory_text ?? "",
    requested_service: detail.requested_service ?? "",
    client_budget_text: detail.client_budget_text ?? "",
    preferred_contact_method: detail.preferred_contact_method ?? "",
    existing_supply_count: detail.existing_supply_count?.toString() ?? "",
    profiles_shown_count: detail.profiles_shown_count?.toString() ?? "",
    external_search_required: detail.external_search_required,
    fulfillment_status: detail.fulfillment_status ?? "unassessed",
    matched_specialist_name: detail.matched_specialist_name ?? "",
    loss_reason: detail.loss_reason ?? "",
    fulfillment_notes: detail.fulfillment_notes ?? "",
    external_specialist_name: detail.external_specialist_name ?? "",
    external_specialist_source: detail.external_specialist_source ?? "",
    external_specialist_contact: detail.external_specialist_contact ?? "",
    specialist_acquisition_status: detail.specialist_acquisition_status ?? "not_started",
    specialist_acquisition_plan: detail.specialist_acquisition_plan ?? "",
    specialist_acquisition_notes: detail.specialist_acquisition_notes ?? "",
    attributed_ad_cost_eur: centsToEuros(detail.attributed_ad_cost_cents),
    attributed_revenue_eur: centsToEuros(detail.attributed_revenue_cents),
  });

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateServiceRequestDemandAction(detail.id, {
        subcategory_text: form.subcategory_text,
        requested_service: form.requested_service,
        client_budget_text: form.client_budget_text,
        preferred_contact_method: form.preferred_contact_method,
        existing_supply_count: form.existing_supply_count,
        profiles_shown_count: form.profiles_shown_count,
        external_search_required: form.external_search_required,
        fulfillment_status: form.fulfillment_status,
        matched_specialist_name: form.matched_specialist_name,
        matched_specialist_id: detail.matched_specialist_id,
        first_response_at: detail.first_response_at,
        matched_at: detail.matched_at,
        closed_at: detail.closed_at,
        loss_reason: form.loss_reason,
        fulfillment_notes: form.fulfillment_notes,
        external_specialist_name: form.external_specialist_name,
        external_specialist_source: form.external_specialist_source,
        external_specialist_contact: form.external_specialist_contact,
        specialist_acquisition_status: form.specialist_acquisition_status,
        specialist_acquisition_plan: form.specialist_acquisition_plan,
        specialist_registered_at: detail.specialist_registered_at,
        specialist_became_paid_at: detail.specialist_became_paid_at,
        specialist_acquisition_notes: form.specialist_acquisition_notes,
        attributed_ad_cost_cents: eurosToCents(form.attributed_ad_cost_eur),
        attributed_revenue_cents: eurosToCents(form.attributed_revenue_eur),
      });
      if (!result.ok) {
        setMessage("Не удалось сохранить данные.");
        return;
      }
      setMessage("Сохранено.");
      router.refresh();
    });
  }

  return (
    <section className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-base">Demand intelligence</h3>
        <p className="text-xs text-gray-600 mt-1">
          Структурированные данные для карты спроса, fill rate, supply gap и B2B-конверсии специалиста.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <label className="text-xs font-medium">Подкатегория
          <input className="mt-1 w-full border rounded px-2 py-1.5 bg-white" value={form.subcategory_text} onChange={(e) => set("subcategory_text", e.target.value)} />
        </label>
        <label className="text-xs font-medium">Конкретная услуга / запрос
          <input className="mt-1 w-full border rounded px-2 py-1.5 bg-white" value={form.requested_service} onChange={(e) => set("requested_service", e.target.value)} />
        </label>
        <label className="text-xs font-medium">Бюджет клиента
          <input className="mt-1 w-full border rounded px-2 py-1.5 bg-white" value={form.client_budget_text} onChange={(e) => set("client_budget_text", e.target.value)} placeholder="например до 100 €" />
        </label>
        <label className="text-xs font-medium">Предпочтительный контакт
          <select className="mt-1 w-full border rounded px-2 py-1.5 bg-white" value={form.preferred_contact_method} onChange={(e) => set("preferred_contact_method", e.target.value)}>
            <option value="">—</option><option value="any">Любой</option><option value="email">Email</option><option value="phone">Телефон</option><option value="telegram">Telegram</option><option value="whatsapp">WhatsApp</option>
          </select>
        </label>
      </div>

      <div className="border-t pt-3">
        <p className="font-semibold text-sm mb-2">Marketplace / fulfillment</p>
        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-xs font-medium">Подходящих специалистов уже в Freuly
            <input type="number" min="0" className="mt-1 w-full border rounded px-2 py-1.5 bg-white" value={form.existing_supply_count} onChange={(e) => set("existing_supply_count", e.target.value)} />
          </label>
          <label className="text-xs font-medium">Профилей показано клиенту
            <input type="number" min="0" className="mt-1 w-full border rounded px-2 py-1.5 bg-white" value={form.profiles_shown_count} onChange={(e) => set("profiles_shown_count", e.target.value)} />
          </label>
          <label className="text-xs font-medium">Fulfillment status
            <select className="mt-1 w-full border rounded px-2 py-1.5 bg-white" value={form.fulfillment_status} onChange={(e) => set("fulfillment_status", e.target.value)}>
              {FULFILLMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs font-medium mt-5">
            <input type="checkbox" checked={form.external_search_required} onChange={(e) => set("external_search_required", e.target.checked)} />
            Нужен внешний поиск специалиста
          </label>
          <label className="text-xs font-medium md:col-span-2">Кому сопоставили
            <input className="mt-1 w-full border rounded px-2 py-1.5 bg-white" value={form.matched_specialist_name} onChange={(e) => set("matched_specialist_name", e.target.value)} />
          </label>
          <label className="text-xs font-medium md:col-span-2">Причина незакрытия / потери
            <input className="mt-1 w-full border rounded px-2 py-1.5 bg-white" value={form.loss_reason} onChange={(e) => set("loss_reason", e.target.value)} />
          </label>
          <label className="text-xs font-medium md:col-span-2">Заметки по закрытию запроса
            <textarea rows={3} className="mt-1 w-full border rounded px-2 py-1.5 bg-white" value={form.fulfillment_notes} onChange={(e) => set("fulfillment_notes", e.target.value)} />
          </label>
        </div>
      </div>

      <div className="border-t pt-3">
        <p className="font-semibold text-sm mb-2">External specialist → paid specialist</p>
        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-xs font-medium">Найденный специалист
            <input className="mt-1 w-full border rounded px-2 py-1.5 bg-white" value={form.external_specialist_name} onChange={(e) => set("external_specialist_name", e.target.value)} />
          </label>
          <label className="text-xs font-medium">Где нашли
            <input className="mt-1 w-full border rounded px-2 py-1.5 bg-white" value={form.external_specialist_source} onChange={(e) => set("external_specialist_source", e.target.value)} placeholder="Google Maps / Telegram / referral…" />
          </label>
          <label className="text-xs font-medium">Контакт специалиста
            <input className="mt-1 w-full border rounded px-2 py-1.5 bg-white" value={form.external_specialist_contact} onChange={(e) => set("external_specialist_contact", e.target.value)} />
          </label>
          <label className="text-xs font-medium">B2B status
            <select className="mt-1 w-full border rounded px-2 py-1.5 bg-white" value={form.specialist_acquisition_status} onChange={(e) => set("specialist_acquisition_status", e.target.value)}>
              {SPECIALIST_ACQUISITION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium">Предложенный / выбранный тариф
            <input className="mt-1 w-full border rounded px-2 py-1.5 bg-white" value={form.specialist_acquisition_plan} onChange={(e) => set("specialist_acquisition_plan", e.target.value)} placeholder="Pro / Premium" />
          </label>
          <label className="text-xs font-medium md:col-span-2">Заметки по привлечению специалиста
            <textarea rows={3} className="mt-1 w-full border rounded px-2 py-1.5 bg-white" value={form.specialist_acquisition_notes} onChange={(e) => set("specialist_acquisition_notes", e.target.value)} />
          </label>
        </div>
      </div>

      <div className="border-t pt-3">
        <p className="font-semibold text-sm mb-2">Экономика запроса</p>
        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-xs font-medium">Атрибутированный рекламный расход, €
            <input inputMode="decimal" className="mt-1 w-full border rounded px-2 py-1.5 bg-white" value={form.attributed_ad_cost_eur} onChange={(e) => set("attributed_ad_cost_eur", e.target.value)} />
          </label>
          <label className="text-xs font-medium">Атрибутированная выручка, €
            <input inputMode="decimal" className="mt-1 w-full border rounded px-2 py-1.5 bg-white" value={form.attributed_revenue_eur} onChange={(e) => set("attributed_revenue_eur", e.target.value)} />
          </label>
        </div>
      </div>

      <button type="button" disabled={pending} onClick={save} className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
        {pending ? "Сохраняю…" : "Сохранить данные спроса"}
      </button>
      {message ? <p className="text-xs text-gray-700">{message}</p> : null}
    </section>
  );
}
