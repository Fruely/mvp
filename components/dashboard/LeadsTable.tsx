"use client";

import { useMemo, useState } from "react";
import type { DashboardLead } from "@/lib/dashboard/getDashboardData";

const ALLOWED_STATUSES = ["new", "contacted", "closed"] as const;
type LeadStatus = (typeof ALLOWED_STATUSES)[number];

function statusStyles(status: string | null): string {
  if (status === "new") return "bg-blue-50 text-blue-700";
  if (status === "contacted") return "bg-violet-50 text-violet-700";
  if (status === "closed") return "bg-emerald-50 text-emerald-700";
  return "bg-gray-100 text-gray-700";
}

export default function LeadsTable({
  initialLeads,
  contactsLocked,
}: {
  initialLeads: DashboardLead[];
  contactsLocked: boolean;
}) {
  const [leads, setLeads] = useState<DashboardLead[]>(initialLeads);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [visibleCount, setVisibleCount] = useState(20);
  const [updatingById, setUpdatingById] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const filteredLeads = useMemo(() => {
    if (statusFilter === "all") return leads;
    return leads.filter((lead) => lead.status === statusFilter);
  }, [leads, statusFilter]);

  const visibleLeads = filteredLeads.slice(0, visibleCount);
  const hasMore = filteredLeads.length > visibleCount;

  async function changeLeadStatus(leadId: string, nextStatus: LeadStatus) {
    const currentLead = leads.find((lead) => lead.id === leadId);
    const prevStatus = (currentLead?.status ?? "new") as LeadStatus;
    if (prevStatus === nextStatus) return;

    setToast(null);
    setUpdatingById((prev) => ({ ...prev, [leadId]: true }));
    setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, status: nextStatus } : lead)));

    try {
      const response = await fetch("/api/specialist/leads/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, status: nextStatus }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || "Не удалось обновить статус");
      }

      setToast({ kind: "success", text: "Статус обновлён" });
    } catch (error) {
      setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, status: prevStatus } : lead)));
      setToast({
        kind: "error",
        text: error instanceof Error ? error.message : "Ошибка при обновлении статуса",
      });
    } finally {
      setUpdatingById((prev) => {
        const next = { ...prev };
        delete next[leadId];
        return next;
      });
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Заявки</h1>
          <p className="mt-1 text-sm text-gray-500">Сортировка по дате (сначала новые) и фильтр по статусу.</p>
        </div>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-600">Фильтр</span>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as LeadStatus | "all");
              setVisibleCount(20);
            }}
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Все статусы</option>
            <option value="new">new</option>
            <option value="contacted">contacted</option>
            <option value="closed">closed</option>
          </select>
        </label>
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

      {visibleLeads.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
          Пока нет заявок
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-2 py-2 font-medium">Клиент</th>
                <th className="px-2 py-2 font-medium">Дата</th>
                <th className="px-2 py-2 font-medium">Контакты</th>
                <th className="px-2 py-2 font-medium">Сообщение</th>
                <th className="px-2 py-2 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody>
              {visibleLeads.map((lead) => {
                const currentStatus = ALLOWED_STATUSES.includes((lead.status ?? "") as LeadStatus)
                  ? (lead.status as LeadStatus)
                  : "new";
                const contactLabel = contactsLocked
                  ? "🔒 Скрыто"
                  : lead.client_email?.trim() || lead.client_phone?.trim() || "—";
                const dateLabel = lead.created_at
                  ? new Date(lead.created_at).toLocaleString("ru-RU")
                  : "—";

                return (
                  <tr key={lead.id} className="border-b border-gray-50 last:border-b-0">
                    <td className="px-2 py-3 text-gray-800">{lead.client_name?.trim() || "—"}</td>
                    <td className="px-2 py-3 whitespace-nowrap text-gray-600">{dateLabel}</td>
                    <td className="px-2 py-3 text-gray-700">{contactLabel}</td>
                    <td className="max-w-[360px] px-2 py-3 text-gray-700">{lead.message?.trim() || "—"}</td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles(currentStatus)}`}>
                          {currentStatus}
                        </span>
                        <select
                          value={currentStatus}
                          disabled={Boolean(updatingById[lead.id])}
                          onChange={(event) => {
                            const nextStatus = event.target.value as LeadStatus;
                            if (!ALLOWED_STATUSES.includes(nextStatus)) return;
                            void changeLeadStatus(lead.id, nextStatus);
                          }}
                          className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                        >
                          <option value="new">new</option>
                          <option value="contacted">contacted</option>
                          <option value="closed">closed</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {hasMore ? (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 20)}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Показать ещё
          </button>
        </div>
      ) : null}
    </section>
  );
}

