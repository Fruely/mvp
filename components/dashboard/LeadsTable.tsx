"use client";

import { useMemo, useState } from "react";
import type { DashboardLead } from "@/lib/dashboard/getDashboardData";
import { t, type Dictionary, type Lang } from "@/lib/i18n";

const ALLOWED_STATUSES = ["new", "accepted", "contacted", "closed"] as const;
type LeadStatus = (typeof ALLOWED_STATUSES)[number];

function statusStyles(status: string | null): string {
  if (status === "new") return "bg-blue-50 text-blue-700";
  if (status === "accepted") return "bg-amber-50 text-amber-700";
  if (status === "contacted") return "bg-violet-50 text-violet-700";
  if (status === "closed") return "bg-emerald-50 text-emerald-700";
  return "bg-gray-100 text-gray-700";
}

function localeTag(lang: Lang): string {
  if (lang === "de") return "de-DE";
  if (lang === "ru") return "ru-RU";
  return "uk-UA";
}

type UnlockResponse = {
  data?: {
    id: string;
    contact_unlocked_at: string | null;
    client_name: string | null;
    client_email: string | null;
    client_phone: string | null;
    message: string | null;
  };
  error?: string;
};

export default function LeadsTable({
  initialLeads,
  lang,
  dict,
}: {
  initialLeads: DashboardLead[];
  lang: Lang;
  dict: Dictionary;
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

  async function unlockContacts(leadId: string) {
    setToast(null);
    setUpdatingById((prev) => ({ ...prev, [leadId]: true }));

    try {
      const response = await fetch(`/api/specialist/leads/${encodeURIComponent(leadId)}/unlock-contacts`, {
        method: "POST",
      });
      const result = (await response.json().catch(() => ({}))) as UnlockResponse;

      if (!response.ok || !result.data) {
        throw new Error(result.error || t(dict, "dashboard.leads.unlockError"));
      }

      const unlocked = result.data;
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId
            ? {
                ...lead,
                contacts_unlocked: true,
                contact_unlocked_at: unlocked.contact_unlocked_at,
                client_name: unlocked.client_name,
                client_email: unlocked.client_email,
                client_phone: unlocked.client_phone,
                message: unlocked.message,
                message_preview: null,
              }
            : lead,
        ),
      );
      setToast({ kind: "success", text: t(dict, "dashboard.leads.unlockSuccess") });
    } catch (error) {
      setToast({
        kind: "error",
        text: error instanceof Error ? error.message : t(dict, "dashboard.leads.unlockError"),
      });
    } finally {
      setUpdatingById((prev) => {
        const next = { ...prev };
        delete next[leadId];
        return next;
      });
    }
  }

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
        throw new Error(result?.error || t(dict, "dashboard.leads.statusError"));
      }

      setToast({ kind: "success", text: t(dict, "dashboard.leads.statusSuccess") });
    } catch (error) {
      setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, status: prevStatus } : lead)));
      setToast({
        kind: "error",
        text: error instanceof Error ? error.message : t(dict, "dashboard.leads.statusError"),
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
          <h1 className="text-xl font-semibold text-gray-900">{t(dict, "dashboard.leads.title")}</h1>
          <p className="mt-1 text-sm text-gray-500">{t(dict, "dashboard.leads.subtitle")}</p>
        </div>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            {t(dict, "dashboard.leads.filterLabel")}
          </span>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as LeadStatus | "all");
              setVisibleCount(20);
            }}
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t(dict, "dashboard.leads.filterAll")}</option>
            <option value="new">new</option>
            <option value="accepted">accepted</option>
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
          {t(dict, "dashboard.leads.empty")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-2 py-2 font-medium">{t(dict, "dashboard.leads.colLead")}</th>
                <th className="px-2 py-2 font-medium">{t(dict, "dashboard.leads.colDate")}</th>
                <th className="px-2 py-2 font-medium">{t(dict, "dashboard.leads.colPreview")}</th>
                <th className="px-2 py-2 font-medium">{t(dict, "dashboard.leads.colContacts")}</th>
                <th className="px-2 py-2 font-medium">{t(dict, "dashboard.leads.colStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {visibleLeads.map((lead) => {
                const currentStatus = ALLOWED_STATUSES.includes((lead.status ?? "") as LeadStatus)
                  ? (lead.status as LeadStatus)
                  : "new";
                const dateLabel = lead.created_at
                  ? new Date(lead.created_at).toLocaleString(localeTag(lang))
                  : "—";
                const sourceLabel = lead.source?.trim() || null;

                return (
                  <tr key={lead.id} className="border-b border-gray-50 last:border-b-0 align-top">
                    <td className="px-2 py-3 text-gray-800">
                      <div className="font-medium">
                        {lead.contacts_unlocked
                          ? lead.client_name?.trim() || t(dict, "dashboard.leads.newLeadLabel")
                          : t(dict, "dashboard.leads.newLeadLabel")}
                      </div>
                      <div className="text-xs text-gray-500">{lead.public_id}</div>
                      {sourceLabel ? (
                        <div className="mt-1 text-xs text-gray-400">
                          {t(dict, "dashboard.leads.source")}: {sourceLabel}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-gray-600">{dateLabel}</td>
                    <td className="max-w-[360px] px-2 py-3 text-gray-700">
                      {lead.contacts_unlocked
                        ? lead.message?.trim() || "—"
                        : lead.message_preview?.trim() || "—"}
                    </td>
                    <td className="px-2 py-3 text-gray-700">
                      {lead.contacts_unlocked ? (
                        <div className="space-y-1 text-sm">
                          {lead.client_phone?.trim() ? <div>{lead.client_phone}</div> : null}
                          {lead.client_email?.trim() ? <div>{lead.client_email}</div> : null}
                          {!lead.client_phone?.trim() && !lead.client_email?.trim() ? "—" : null}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs leading-relaxed text-gray-500">
                            {t(dict, "dashboard.leads.contactsProtectedHint")}
                          </p>
                          <button
                            type="button"
                            disabled={Boolean(updatingById[lead.id])}
                            onClick={() => void unlockContacts(lead.id)}
                            className="inline-flex h-9 items-center rounded-md bg-indigo-600 px-3 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                          >
                            {t(dict, "dashboard.leads.unlockCta")}
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <span
                          className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles(currentStatus)}`}
                        >
                          {currentStatus}
                        </span>
                        {lead.contacts_unlocked ? (
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
                            <option value="accepted">accepted</option>
                            <option value="contacted">contacted</option>
                            <option value="closed">closed</option>
                          </select>
                        ) : null}
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
            {t(dict, "dashboard.leads.loadMore")}
          </button>
        </div>
      ) : null}
    </section>
  );
}
