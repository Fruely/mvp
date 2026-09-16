"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DashboardLead } from "@/lib/dashboard/getDashboardData";
import type { DashboardLeadAccessDecisionMap } from "@/lib/leadEngine/accessDecisionBatch";
import type { LeadAccessDecision } from "@/lib/leadEngine/accessDecision";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import {
  dashboardEmptyStateClass,
  dashboardFieldClass,
  dashboardLinkSecondaryClass,
  dashboardTableHeadClass,
  dashboardTableRowClass,
} from "@/components/dashboard/dashboardStyles";
import { Alert, Badge, Button, Card, Select, type BadgeVariant } from "@/components/ui";
import { CONTACT_UNLOCK_REQUIRES_ACTIVE_PLAN } from "@/lib/billing/contactUnlockEntitlement";
import { directPplBuyLabel } from "@/lib/dashboard/directPplBuyCopy";
import { resolveRouteLang, t, type Dictionary, type Lang } from "@/lib/i18n";

const ALLOWED_STATUSES = ["new", "accepted", "contacted", "closed"] as const;
type LeadStatus = (typeof ALLOWED_STATUSES)[number];

function leadStatusBadgeVariant(status: string | null): BadgeVariant {
  if (status === "new") return "info";
  if (status === "accepted") return "warning";
  if (status === "contacted") return "neutral";
  if (status === "closed") return "success";
  return "neutral";
}

function localeTag(lang: Lang): string {
  if (lang === "de") return "de-DE";
  if (lang === "ru") return "ru-RU";
  return "uk-UA";
}

function moneyLabel(priceCents: number, currency: string, lang: Lang): string {
  return new Intl.NumberFormat(localeTag(lang), {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(priceCents / 100);
}

function commercialCopy(
  decision: LeadAccessDecision | undefined,
  lang: Lang,
): { title: string; detail?: string } | null {
  if (!decision) return null;

  if (decision.state === "unlocked") {
    if (decision.source === "subscription") {
      return {
        title:
          lang === "de"
            ? "Im Abo enthalten"
            : lang === "ru"
              ? "Включено в подписку"
              : "Включено в підписку",
      };
    }
    if (decision.source === "payment") {
      return {
        title:
          lang === "de"
            ? "Lead bezahlt"
            : lang === "ru"
              ? "Заявка оплачена"
              : "Заявку оплачено",
      };
    }
    return null;
  }

  if (decision.state === "processing") {
    return {
      title:
        lang === "de"
          ? "Zahlung wird verarbeitet"
          : lang === "ru"
            ? "Платёж обрабатывается"
            : "Платіж обробляється",
    };
  }

  if (decision.state === "locked" && decision.priceCents && decision.currency) {
    const price = moneyLabel(decision.priceCents, decision.currency, lang);
    return {
      title:
        lang === "de"
          ? `Lead-Preis: ${price}`
          : lang === "ru"
            ? `Стоимость заявки: ${price}`
            : `Вартість заявки: ${price}`,
      detail:
        decision.canPurchase
          ? lang === "de"
            ? "Pay-per-Lead ist verfügbar."
            : lang === "ru"
              ? "Доступна покупка этой заявки."
              : "Доступна купівля цієї заявки."
          : lang === "de"
            ? "Pay-per-Lead wird schrittweise aktiviert."
            : lang === "ru"
              ? "Оплата за отдельную заявку подключается поэтапно."
              : "Оплата за окрему заявку підключається поетапно.",
    };
  }

  if (decision.state === "unavailable") {
    return {
      title:
        lang === "de"
          ? "Nicht verfügbar"
          : lang === "ru"
            ? "Недоступно"
            : "Недоступно",
    };
  }

  return null;
}

function buyLabel(decision: LeadAccessDecision, lang: Lang): string {
  if (decision.state !== "locked" || !decision.canPurchase) return "";
  const uiLang = resolveRouteLang(lang);
  const price = moneyLabel(decision.priceCents, decision.currency, uiLang);
  return directPplBuyLabel(uiLang, price);
}

function paymentMessage(kind: "checking" | "cancelled" | "delayed", lang: Lang): string {
  if (kind === "cancelled") {
    if (lang === "de") return "Die Zahlung wurde abgebrochen.";
    if (lang === "ru") return "Оплата отменена.";
    return "Оплату скасовано.";
  }
  if (kind === "delayed") {
    if (lang === "de") return "Die Zahlung wird noch bestätigt. Bitte aktualisieren Sie die Seite später erneut.";
    if (lang === "ru") return "Платёж ещё подтверждается. Обновите страницу немного позже.";
    return "Платіж ще підтверджується. Оновіть сторінку трохи пізніше.";
  }
  if (lang === "de") return "Zahlung wird bestätigt. Die Kontakte werden erst nach der Stripe-Bestätigung freigeschaltet.";
  if (lang === "ru") return "Проверяем оплату. Контакты откроются только после подтверждения Stripe.";
  return "Перевіряємо оплату. Контакти відкриються лише після підтвердження Stripe.";
}

type UnlockResponse = {
  item?: {
    id: string;
    contact_unlocked_at: string | null;
    client_name: string | null;
    client_email: string | null;
    client_phone: string | null;
    message: string | null;
  };
  error?: string;
};

type CheckoutResponse = {
  checkout_url?: string;
  error?: string;
};

export default function LeadsTable({
  initialLeads,
  accessDecisions,
  lang,
  dict,
  billingHref,
}: {
  initialLeads: DashboardLead[];
  accessDecisions: DashboardLeadAccessDecisionMap;
  lang: Lang;
  dict: Dictionary;
  billingHref: string;
}) {
  const uiLang = resolveRouteLang(lang);
  const router = useRouter();
  const paymentPollCountRef = useRef(0);
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const offerId = params.get("offer")?.trim() || null;
    if (!payment) return;

    const cleanHref = `/${uiLang}/specialist/dashboard/leads`;

    if (payment === "cancelled") {
      setToast({ kind: "error", text: paymentMessage("cancelled", uiLang) });
      router.replace(cleanHref);
      return;
    }

    if (payment !== "success" || !offerId) return;

    const matchingDecision = Object.values(accessDecisions).find((decision) => {
      if (decision.state === "locked" || decision.state === "processing") {
        return decision.offerId === offerId;
      }
      return false;
    });

    if (!matchingDecision) {
      setToast({ kind: "success", text: t(dict, "dashboard.leads.unlockSuccess") });
      router.replace(cleanHref);
      return;
    }

    if (paymentPollCountRef.current >= 10) {
      setToast({ kind: "error", text: paymentMessage("delayed", uiLang) });
      router.replace(cleanHref);
      return;
    }

    setToast({ kind: "success", text: paymentMessage("checking", uiLang) });
    const timer = window.setTimeout(() => {
      paymentPollCountRef.current += 1;
      router.refresh();
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [accessDecisions, dict, lang, router, uiLang]);

  async function buyLead(leadId: string, offerId: string) {
    setToast(null);
    setUpdatingById((prev) => ({ ...prev, [leadId]: true }));

    try {
      const response = await fetch("/api/billing/request-offers/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offer_id: offerId, lang: uiLang }),
      });
      const result = (await response.json().catch(() => ({}))) as CheckoutResponse;

      if (response.status === 409 && (result.error === "already_has_access" || result.error === "subscription_access")) {
        router.refresh();
        throw new Error(
          uiLang === "de"
            ? "Der Zugriff ist bereits verfügbar. Die Seite wird aktualisiert."
            : uiLang === "ru"
              ? "Доступ уже доступен. Обновляем страницу."
              : "Доступ уже доступний. Оновлюємо сторінку.",
        );
      }

      if (!response.ok || !result.checkout_url) {
        throw new Error(
          uiLang === "de"
            ? "Die Zahlung konnte nicht gestartet werden."
            : uiLang === "ru"
              ? "Не удалось запустить оплату заявки."
              : "Не вдалося запустити оплату заявки.",
        );
      }

      window.location.assign(result.checkout_url);
    } catch (error) {
      setToast({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : uiLang === "de"
              ? "Die Zahlung konnte nicht gestartet werden."
              : uiLang === "ru"
                ? "Не удалось запустить оплату заявки."
                : "Не вдалося запустити оплату заявки.",
      });
      setUpdatingById((prev) => {
        const next = { ...prev };
        delete next[leadId];
        return next;
      });
    }
  }

  async function unlockContacts(leadId: string) {
    setToast(null);
    setUpdatingById((prev) => ({ ...prev, [leadId]: true }));

    try {
      const response = await fetch(`/api/specialist/leads/${encodeURIComponent(leadId)}/unlock-contacts`, {
        method: "POST",
      });
      const result = (await response.json().catch(() => ({}))) as UnlockResponse;

      if (response.status === 403 && result.error === CONTACT_UNLOCK_REQUIRES_ACTIVE_PLAN) {
        throw new Error(t(dict, "dashboard.leads.unlockRequiresPlan"));
      }

      if (!response.ok || !result.item) {
        throw new Error(result.error || t(dict, "dashboard.leads.unlockError"));
      }

      const unlocked = result.item;
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
    <Card padding="lg" className="shadow-none">
      <DashboardPageHeader
        title={t(dict, "dashboard.leads.title")}
        subtitle={t(dict, "dashboard.leads.subtitle")}
        actions={
          <Select
            id="leads-status-filter"
            label={t(dict, "dashboard.leads.filterLabel")}
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as LeadStatus | "all");
              setVisibleCount(20);
            }}
            options={[
              { value: "all", label: t(dict, "dashboard.leads.filterAll") },
              { value: "new", label: "new" },
              { value: "accepted", label: "accepted" },
              { value: "contacted", label: "contacted" },
              { value: "closed", label: "closed" },
            ]}
            containerClassName="min-w-[10rem]"
          />
        }
        className="mb-freuly-5"
      />

      {toast ? (
        <Alert variant={toast.kind === "success" ? "success" : "error"} className="mb-freuly-4">
          {toast.text}
        </Alert>
      ) : null}

      {visibleLeads.length === 0 ? (
        <div className={dashboardEmptyStateClass}>{t(dict, "dashboard.leads.empty")}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-freuly-body-sm">
            <thead>
              <tr className={dashboardTableHeadClass}>
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
                  ? new Date(lead.created_at).toLocaleString(localeTag(uiLang))
                  : "—";
                const sourceLabel = lead.source?.trim() || null;
                const decision = accessDecisions[lead.id];
                const commercial = commercialCopy(decision, uiLang);
                const canUnlockThisLead = decision?.state === "unlocked";
                const canBuyThisLead = decision?.state === "locked" && decision.canPurchase;
                const needsSubscriptionFallback =
                  decision?.state === "locked" &&
                  !decision.canPurchase &&
                  decision.reason === "subscription_required" &&
                  !decision.priceCents;

                return (
                  <tr key={lead.id} className={dashboardTableRowClass}>
                    <td className="px-2 py-3 text-freuly-text-primary">
                      <div className="font-medium">
                        {lead.contacts_unlocked
                          ? lead.client_name?.trim() || t(dict, "dashboard.leads.newLeadLabel")
                          : t(dict, "dashboard.leads.newLeadLabel")}
                      </div>
                      <div className="text-xs text-freuly-text-muted">{lead.public_id}</div>
                      {sourceLabel ? (
                        <div className="mt-1 text-xs text-freuly-text-muted">
                          {t(dict, "dashboard.leads.source")}: {sourceLabel}
                        </div>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-freuly-text-secondary">{dateLabel}</td>
                    <td className="max-w-[360px] px-2 py-3 text-freuly-text-secondary">
                      {lead.contacts_unlocked
                        ? lead.message?.trim() || "—"
                        : lead.message_preview?.trim() || "—"}
                    </td>
                    <td className="px-2 py-3 text-freuly-text-secondary">
                      {lead.contacts_unlocked ? (
                        <div className="space-y-1 text-freuly-body-sm">
                          {lead.client_phone?.trim() ? <div>{lead.client_phone}</div> : null}
                          {lead.client_email?.trim() ? <div>{lead.client_email}</div> : null}
                          {!lead.client_phone?.trim() && !lead.client_email?.trim() ? "—" : null}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {commercial ? (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-freuly-text-primary">{commercial.title}</p>
                              {commercial.detail ? (
                                <p className="text-xs leading-relaxed text-freuly-text-muted">{commercial.detail}</p>
                              ) : null}
                            </div>
                          ) : (
                            <p className="text-xs leading-relaxed text-freuly-text-muted">
                              {t(dict, "dashboard.leads.unlockRequiresPlan")}
                            </p>
                          )}

                          {canUnlockThisLead ? (
                            <Button
                              type="button"
                              className="min-h-9 h-9 px-3 text-xs"
                              disabled={Boolean(updatingById[lead.id])}
                              onClick={() => void unlockContacts(lead.id)}
                            >
                              {t(dict, "dashboard.leads.unlockCta")}
                            </Button>
                          ) : canBuyThisLead ? (
                            <Button
                              type="button"
                              className="min-h-9 h-9 px-3 text-xs"
                              disabled={Boolean(updatingById[lead.id])}
                              onClick={() => void buyLead(lead.id, decision.offerId)}
                            >
                              {buyLabel(decision, uiLang)}
                            </Button>
                          ) : needsSubscriptionFallback ? (
                            <Link href={billingHref} className={`${dashboardLinkSecondaryClass} !min-h-9 h-9 !px-3 !text-xs`}>
                              {t(dict, "dashboard.leads.unlockRequiresPlanCta")}
                            </Link>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Badge variant={leadStatusBadgeVariant(currentStatus)}>{currentStatus}</Badge>
                        {lead.contacts_unlocked ? (
                          <select
                            value={currentStatus}
                            disabled={Boolean(updatingById[lead.id])}
                            onChange={(event) => {
                              const nextStatus = event.target.value as LeadStatus;
                              if (!ALLOWED_STATUSES.includes(nextStatus)) return;
                              void changeLeadStatus(lead.id, nextStatus);
                            }}
                            className={`${dashboardFieldClass} !min-h-8 h-8 !py-1 text-xs disabled:opacity-60`}
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
        <div className="mt-freuly-4 text-center">
          <button type="button" onClick={() => setVisibleCount((prev) => prev + 20)} className={dashboardLinkSecondaryClass}>
            {t(dict, "dashboard.leads.loadMore")}
          </button>
        </div>
      ) : null}
    </Card>
  );
}
