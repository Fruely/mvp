"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCommissionEligibleAt } from "@/lib/partners/commissionValidation";
import {
  buildCreditApplyBody,
  buildPayoutRequestBody,
  canApplyCreditToCommission,
  canRequestPayoutForCommission,
  centsToEuroInput,
  creditErrorLocaleKey,
  euroInputToCents,
  payoutErrorLocaleKey,
  payoutStatusLocaleKey,
  type PartnerCommissionUiRow,
  type PartnerPayoutUiRow,
  validateCreditAmountCents,
} from "@/lib/partners/partnerDashboardUi";
import { buildCanonicalReferralUrl, resolveClientPublicOrigin } from "@/lib/partners/referralUrl";
import PartnerReferralQr from "@/components/partners/PartnerReferralQr";
import PartnerContractSection from "@/components/partners/PartnerContractSection";
import { t, type Dictionary } from "@/lib/i18n";

type DashboardPayload = {
  partner: {
    name: string;
    status: string;
    currency: string;
    referral_code: string;
    referral_path: string;
  };
  access_mode?: string;
  period: "month" | "all";
  metrics: {
    clicks: number;
    registrations: number;
    payments: number;
    earned_cents: number;
  };
  balances: {
    pending_cents: number;
    approved_unpaid_cents: number;
    paid_cents: number;
    credited_cents?: number;
    total_earned_cents: number;
    available_for_payout_cents: number;
  };
  links: Array<{
    id: string;
    code: string;
    campaign: string | null;
    is_active: boolean;
    referral_path: string;
  }>;
  commissions: PartnerCommissionUiRow[];
  payouts: PartnerPayoutUiRow[];
  notifications: Array<{
    id: string;
    title: string;
    body: string;
    read_at: string | null;
    created_at: string;
  }>;
  unread_notifications: number;
};

type ActionModal =
  | { type: "credit"; commission: PartnerCommissionUiRow }
  | { type: "payout"; commission: PartnerCommissionUiRow };

function formatMoney(cents: number, currency: string, lang: string): string {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat(lang === "de" ? "de-DE" : lang === "ru" ? "ru-RU" : "uk-UA", {
      style: "currency",
      currency: currency || "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `€${amount.toFixed(2)}`;
  }
}

function formatDate(iso: string | null, lang: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(
      lang === "de" ? "de-DE" : lang === "ru" ? "ru-RU" : "uk-UA"
    );
  } catch {
    return iso;
  }
}

function statusLabel(dict: Dictionary, status: string): string {
  return t(dict, `partner.status.${status}`, { defaultValue: status });
}

function expectedConfirmationDate(earnedAt: string, lang: string): string {
  try {
    return getCommissionEligibleAt(earnedAt).toLocaleDateString(
      lang === "de" ? "de-DE" : lang === "ru" ? "ru-RU" : "uk-UA"
    );
  } catch {
    return "";
  }
}

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function PartnerDashboardClient({
  lang,
  dict,
}: {
  lang: string;
  dict: Dictionary;
}) {
  const [period, setPeriod] = useState<"month" | "all">("month");
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [actionModal, setActionModal] = useState<ActionModal | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/partner/dashboard?period=${period}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "error");
        setData(null);
        return;
      }
      setData(json as DashboardPayload);
    } catch {
      setError("error");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  const canonicalReferralUrl = useMemo(() => {
    if (!data?.partner.referral_code) return "";
    return buildCanonicalReferralUrl(resolveClientPublicOrigin(), data.partner.referral_code);
  }, [data?.partner.referral_code]);

  const canShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copyLink() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(canonicalReferralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function shareLink() {
    if (!data || !navigator.share) return;
    try {
      await navigator.share({
        url: canonicalReferralUrl,
        title: t(dict, "partner.dashboard.shareTitle", { defaultValue: "Freuly" }),
        text: t(dict, "partner.dashboard.shareText"),
      });
    } catch {
      /* user cancelled */
    }
  }

  async function markRead() {
    await fetch("/api/partner/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await load();
  }

  function openCreditModal(commission: PartnerCommissionUiRow) {
    setActionMsg(null);
    setAmountInput(centsToEuroInput(commission.available_cents));
    setActionModal({ type: "credit", commission });
  }

  function openPayoutModal(commission: PartnerCommissionUiRow) {
    setActionMsg(null);
    setActionModal({ type: "payout", commission });
  }

  function closeModal() {
    if (actionLoading) return;
    setActionModal(null);
    setActionMsg(null);
  }

  async function submitCredit() {
    if (!actionModal || actionModal.type !== "credit") return;
    const commission = actionModal.commission;
    const amountCents = euroInputToCents(amountInput);
    const validation = amountCents
      ? validateCreditAmountCents(amountCents, commission.available_cents)
      : "invalid";
    if (validation !== "ok" || !amountCents) {
      setActionMsg(t(dict, "partner.dashboard.errors.amountExceedsAvailable"));
      return;
    }

    setActionLoading(true);
    setActionMsg(null);
    const idempotencyKey = newIdempotencyKey();
    try {
      const res = await fetch("/api/partner/credits/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildCreditApplyBody({
            commissionRef: commission.public_ref,
            amountCents,
            idempotencyKey,
          })
        ),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = typeof json.error === "string" ? json.error : "generic";
        setActionMsg(t(dict, creditErrorLocaleKey(code)));
        return;
      }
      setActionModal(null);
      setSuccessNotice(t(dict, "partner.dashboard.creditSuccess"));
      await load();
    } catch {
      setActionMsg(t(dict, "partner.dashboard.errors.generic"));
    } finally {
      setActionLoading(false);
    }
  }

  async function submitPayout() {
    if (!actionModal || actionModal.type !== "payout") return;
    const commission = actionModal.commission;
    setActionLoading(true);
    setActionMsg(null);
    try {
      const res = await fetch("/api/partner/payouts/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayoutRequestBody(commission.public_ref)),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = typeof json.error === "string" ? json.error : "generic";
        setActionMsg(t(dict, payoutErrorLocaleKey(code)));
        return;
      }
      setActionModal(null);
      setSuccessNotice(t(dict, "partner.dashboard.payoutSuccess"));
      await load();
    } catch {
      setActionMsg(t(dict, "partner.dashboard.errors.generic"));
    } finally {
      setActionLoading(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-sm text-gray-500">
        {t(dict, "partner.dashboard.loading")}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-sm text-red-600">
        {t(dict, "partner.dashboard.error")}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">
          {t(dict, "partner.dashboard.title")}
        </h1>
        <p className="text-sm text-gray-500">
          {data.partner.name} · {statusLabel(dict, data.partner.status)}
        </p>
        <Link
          href={`/${lang}/partners/agreement`}
          className="inline-block text-sm font-medium text-indigo-700 underline-offset-2 hover:underline"
        >
          {t(dict, "partner.public.agreementLink")}
        </Link>
      </header>

      {data.access_mode === "read_only" ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t(dict, "partner.dashboard.pausedBanner")}
        </p>
      ) : null}
      {data.access_mode === "history_only" ? (
        <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
          {t(dict, "partner.dashboard.disabledBanner")}
        </p>
      ) : null}

      {data.unread_notifications > 0 ? (
        <button
          type="button"
          onClick={() => void markRead()}
          className="w-full rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-left text-sm text-indigo-900"
        >
          {t(dict, "partner.dashboard.unread", {
            defaultValue: `${data.unread_notifications} new`,
          }).replace("{{count}}", String(data.unread_notifications))}
          {data.notifications[0] ? (
            <span className="mt-1 block font-medium">{data.notifications[0].title}</span>
          ) : null}
        </button>
      ) : null}

      {successNotice ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {successNotice}
        </p>
      ) : null}

      <section className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 px-5 py-6 text-white shadow-sm">
        <p className="text-sm text-indigo-100">{t(dict, "partner.dashboard.balanceTitle")}</p>
        <p className="mt-2 text-4xl font-semibold tracking-tight">
          {formatMoney(data.balances.available_for_payout_cents, data.partner.currency, lang)}
        </p>
        <p className="mt-1 text-sm text-indigo-100">
          {t(dict, "partner.dashboard.availableLabel")}
        </p>
        <p className="mt-3 text-sm text-indigo-50">
          {t(dict, "partner.dashboard.totalEarned").replace(
            "{{amount}}",
            formatMoney(data.balances.total_earned_cents, data.partner.currency, lang)
          )}
        </p>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">
          {t(dict, "partner.dashboard.linkTitle")}
        </h2>
        <p className="break-all rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-gray-800">
          {canonicalReferralUrl || data.partner.referral_path}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void copyLink()}
            className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"
          >
            {copied ? t(dict, "partner.dashboard.copied") : t(dict, "partner.dashboard.copy")}
          </button>
          {canShare ? (
            <button
              type="button"
              onClick={() => void shareLink()}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800"
            >
              {t(dict, "partner.dashboard.share")}
            </button>
          ) : null}
        </div>
        {data.partner.referral_code && canonicalReferralUrl ? (
          <PartnerReferralQr
            url={canonicalReferralUrl}
            code={data.partner.referral_code}
            dict={dict}
          />
        ) : null}
      </section>

      <PartnerContractSection lang={lang} dict={dict} />

      <div className="flex rounded-lg border border-gray-200 p-1 text-sm">
        <button
          type="button"
          className={`flex-1 rounded-md px-3 py-1.5 font-medium ${
            period === "month" ? "bg-gray-900 text-white" : "text-gray-600"
          }`}
          onClick={() => setPeriod("month")}
        >
          {t(dict, "partner.dashboard.periodMonth")}
        </button>
        <button
          type="button"
          className={`flex-1 rounded-md px-3 py-1.5 font-medium ${
            period === "all" ? "bg-gray-900 text-white" : "text-gray-600"
          }`}
          onClick={() => setPeriod("all")}
        >
          {t(dict, "partner.dashboard.periodAll")}
        </button>
      </div>

      <section className="grid grid-cols-2 gap-3">
        {(
          [
            ["clicks", data.metrics.clicks, "partner.dashboard.metricClicks"],
            ["regs", data.metrics.registrations, "partner.dashboard.metricRegs"],
            ["payments", data.metrics.payments, "partner.dashboard.metricPayments"],
            [
              "earned",
              formatMoney(data.metrics.earned_cents, data.partner.currency, lang),
              "partner.dashboard.metricEarned",
            ],
          ] as const
        ).map(([key, value, labelKey]) => (
          <div key={key} className="rounded-xl border border-gray-200 bg-white px-3 py-3">
            <p className="text-xs text-gray-500">{t(dict, labelKey)}</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">
          {t(dict, "partner.dashboard.payoutsTitle")}
        </h2>
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
          <p>
            {t(dict, "partner.dashboard.pendingLabel")}:{" "}
            <span className="font-medium text-gray-900">
              {formatMoney(data.balances.pending_cents, data.partner.currency, lang)}
            </span>
          </p>
          <p>
            {t(dict, "partner.dashboard.availableLabel")}:{" "}
            <span className="font-medium text-gray-900">
              {formatMoney(data.balances.available_for_payout_cents, data.partner.currency, lang)}
            </span>
          </p>
          <p>
            {t(dict, "partner.dashboard.creditedLabel")}:{" "}
            <span className="font-medium text-gray-900">
              {formatMoney(data.balances.credited_cents ?? 0, data.partner.currency, lang)}
            </span>
          </p>
          <p>
            {t(dict, "partner.dashboard.paidLabel")}:{" "}
            <span className="font-medium text-gray-900">
              {formatMoney(data.balances.paid_cents, data.partner.currency, lang)}
            </span>
          </p>
        </div>
        <p className="text-xs text-gray-500">{t(dict, "partner.dashboard.manualPayoutExplainer")}</p>
        <p className="text-xs text-gray-500">{t(dict, "partner.dashboard.payoutNote")}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-900">
          {t(dict, "partner.dashboard.historyTitle")}
        </h2>
        {data.commissions.length === 0 ? (
          <p className="text-sm text-gray-500">{t(dict, "partner.dashboard.historyEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {data.commissions.map((c) => {
              const showCredit = canApplyCreditToCommission(c, data.access_mode);
              const showPayout = canRequestPayoutForCommission(c, data.access_mode);
              return (
                <li
                  key={c.public_ref}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-lg font-semibold text-gray-900">
                      +{formatMoney(c.amount_cents, c.currency, lang)}
                    </span>
                    <span className="text-xs text-gray-500">{statusLabel(dict, c.status)}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {t(dict, "partner.dashboard.commissionRefLabel")}:{" "}
                    <span className="font-mono">{c.public_ref}</span>
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(c.earned_at).toLocaleDateString()}
                  </p>
                  {c.status === "pending" ? (
                    <p className="mt-1 text-xs text-gray-500">
                      {t(dict, "partner.dashboard.expectedConfirmLabel")}:{" "}
                      {expectedConfirmationDate(c.earned_at, lang)}
                    </p>
                  ) : null}
                  <div className="mt-2 space-y-1 text-xs text-gray-600">
                    <p>
                      {t(dict, "partner.dashboard.availableRemainderLabel")}:{" "}
                      {formatMoney(c.available_cents, c.currency, lang)}
                    </p>
                    {(c.credited_cents > 0 || c.paid_out_cents > 0 || c.payout_reserved) && (
                      <>
                        {c.credited_cents > 0 ? (
                          <p>
                            {t(dict, "partner.dashboard.creditedAmountLabel")}:{" "}
                            {formatMoney(c.credited_cents, c.currency, lang)}
                          </p>
                        ) : null}
                        {c.paid_out_cents > 0 ? (
                          <p>
                            {t(dict, "partner.dashboard.paidOutAmountLabel")}:{" "}
                            {formatMoney(c.paid_out_cents, c.currency, lang)}
                          </p>
                        ) : null}
                        {c.payout_reserved ? (
                          <p className="text-amber-700">
                            {t(dict, "partner.dashboard.payoutReservedLabel")}
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>
                  {(showCredit || showPayout) && (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      {showCredit ? (
                        <button
                          type="button"
                          onClick={() => openCreditModal(c)}
                          className="flex-1 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-900"
                        >
                          {t(dict, "partner.dashboard.creditActionBtn")}
                        </button>
                      ) : null}
                      {showPayout ? (
                        <button
                          type="button"
                          onClick={() => openPayoutModal(c)}
                          className="flex-1 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white"
                        >
                          {t(dict, "partner.dashboard.payoutActionBtn")}
                        </button>
                      ) : null}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-900">
          {t(dict, "partner.dashboard.payoutHistoryTitle")}
        </h2>
        {data.payouts.length === 0 ? (
          <p className="text-sm text-gray-500">{t(dict, "partner.dashboard.payoutHistoryEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {data.payouts.map((p, idx) => (
              <li
                key={`${p.requested_at ?? "na"}-${p.amount_cents}-${idx}`}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-gray-900">
                    {formatMoney(p.amount_cents, p.currency, lang)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {t(dict, payoutStatusLocaleKey(p.status), { defaultValue: p.status })}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {t(dict, "partner.dashboard.payoutHistoryRequested")}:{" "}
                  {formatDate(p.requested_at, lang)}
                </p>
                {p.paid_at ? (
                  <p className="mt-1 text-xs text-gray-500">
                    {t(dict, "partner.dashboard.payoutHistoryPaid")}: {formatDate(p.paid_at, lang)}
                  </p>
                ) : null}
                {p.cancelled_at ? (
                  <p className="mt-1 text-xs text-gray-500">
                    {t(dict, "partner.dashboard.payoutHistoryCancelled")}:{" "}
                    {formatDate(p.cancelled_at, lang)}
                  </p>
                ) : null}
                {p.payment_reference ? (
                  <p className="mt-1 text-xs font-mono text-gray-600">{p.payment_reference}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.links.length > 1 ? (
        <details className="rounded-xl border border-gray-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-gray-900">
            {t(dict, "partner.dashboard.campaignsTitle")}
          </summary>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            {data.links.map((l) => (
              <li key={l.id} className="font-mono text-xs">
                {l.referral_path}
                {l.campaign ? ` · ${l.campaign}` : ""}
                {!l.is_active ? " (off)" : ""}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {actionModal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
          >
            {actionModal.type === "credit" ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900">
                  {t(dict, "partner.dashboard.creditConfirmTitle")}
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  {t(dict, "partner.dashboard.creditConfirmBody")}
                </p>
                <p className="mt-2 text-xs font-mono text-gray-500">
                  {actionModal.commission.public_ref}
                </p>
                <label className="mt-4 block text-sm font-medium text-gray-700">
                  {t(dict, "partner.dashboard.creditAmountLabel")}
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    disabled={actionLoading}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
                {actionMsg ? <p className="mt-2 text-sm text-red-600">{actionMsg}</p> : null}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => void submitCredit()}
                    className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {actionLoading
                      ? t(dict, "partner.dashboard.creditSubmitting")
                      : t(dict, "partner.dashboard.creditConfirmSubmit")}
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={closeModal}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700"
                  >
                    {t(dict, "partner.dashboard.creditCancel")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900">
                  {t(dict, "partner.dashboard.payoutConfirmTitle")}
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  {t(dict, "partner.dashboard.payoutConfirmBody")}
                </p>
                <p className="mt-2 text-sm font-medium text-gray-900">
                  {formatMoney(
                    actionModal.commission.available_cents,
                    actionModal.commission.currency,
                    lang
                  )}
                </p>
                {actionMsg ? <p className="mt-2 text-sm text-red-600">{actionMsg}</p> : null}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => void submitPayout()}
                    className="flex-1 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {actionLoading
                      ? t(dict, "partner.dashboard.payoutSubmitting")
                      : t(dict, "partner.dashboard.payoutConfirmSubmit")}
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={closeModal}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700"
                  >
                    {t(dict, "partner.dashboard.payoutCancel")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
