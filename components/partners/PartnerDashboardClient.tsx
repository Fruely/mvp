"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCommissionEligibleAt } from "@/lib/partners/commissionValidation";
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
    commission_amount_cents: number;
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
  commissions: Array<{
    id: string;
    public_ref: string;
    amount_cents: number;
    currency: string;
    status: string;
    earned_at: string;
  }>;
  notifications: Array<{
    id: string;
    title: string;
    body: string;
    read_at: string | null;
    created_at: string;
  }>;
  unread_notifications: number;
  last_payout_at: string | null;
  payouts_enabled?: boolean;
};

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
    return `€${amount.toFixed(0)}`;
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
  const [creditMsg, setCreditMsg] = useState<string | null>(null);
  const [creditLoading, setCreditLoading] = useState(false);

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
    return buildCanonicalReferralUrl(
      resolveClientPublicOrigin(),
      data.partner.referral_code
    );
  }, [data?.partner.referral_code]);

  const canShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copyLink() {
    if (!data) return;
    const url = canonicalReferralUrl;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function shareLink() {
    if (!data || !navigator.share) return;
    const url = canonicalReferralUrl;
    try {
      await navigator.share({
        url,
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

  async function applyCredit() {
    if (!data) return;
    const available = data.balances.available_for_payout_cents;
    if (!available || available <= 0) return;
    setCreditLoading(true);
    setCreditMsg(null);
    try {
      const res = await fetch("/api/partner/credits/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_cents: available }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreditMsg(
          typeof json.error === "string"
            ? json.error
            : t(dict, "partner.dashboard.creditError")
        );
        return;
      }
      setCreditMsg(t(dict, "partner.dashboard.creditSuccess"));
      await load();
    } catch {
      setCreditMsg(t(dict, "partner.dashboard.creditError"));
    } finally {
      setCreditLoading(false);
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
        <p className="text-sm text-gray-700">
          {t(dict, "partner.dashboard.availableLabel")}:{" "}
          {formatMoney(data.balances.available_for_payout_cents, data.partner.currency, lang)}
        </p>
        <p className="text-sm text-gray-700">
          {t(dict, "partner.dashboard.pendingLabel")}:{" "}
          {formatMoney(data.balances.pending_cents, data.partner.currency, lang)}
        </p>
        <p className="text-sm text-gray-700">
          {t(dict, "partner.dashboard.creditedLabel")}:{" "}
          {formatMoney(data.balances.credited_cents ?? 0, data.partner.currency, lang)}
        </p>
        <p className="text-sm text-gray-700">
          {t(dict, "partner.dashboard.paidLabel")}:{" "}
          {formatMoney(data.balances.paid_cents, data.partner.currency, lang)}
        </p>

        {data.balances.available_for_payout_cents > 0 ? (
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              disabled={!data.payouts_enabled}
              className="w-full rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
              title={
                data.payouts_enabled
                  ? undefined
                  : t(dict, "partner.dashboard.cashPayoutPendingHint")
              }
            >
              {data.payouts_enabled
                ? t(dict, "partner.dashboard.cashPayoutCta")
                : t(dict, "partner.dashboard.cashPayoutPendingCta")}
            </button>
            {!data.payouts_enabled ? (
              <p className="text-xs text-gray-500">
                {t(dict, "partner.dashboard.cashPayoutPendingHint")}
              </p>
            ) : null}
            <button
              type="button"
              disabled={creditLoading}
              onClick={() => void applyCredit()}
              className="w-full rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-900 disabled:opacity-60"
            >
              {creditLoading
                ? t(dict, "partner.dashboard.creditSubmitting")
                : t(dict, "partner.dashboard.creditCta")}
            </button>
            {creditMsg ? <p className="text-xs text-gray-600">{creditMsg}</p> : null}
          </div>
        ) : null}

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
            {data.commissions.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-lg font-semibold text-gray-900">
                    +{formatMoney(c.amount_cents, c.currency, lang)}
                  </span>
                  <span className="text-xs text-gray-500">{statusLabel(dict, c.status)}</span>
                </div>
                <p className="mt-1 text-gray-600">{t(dict, "partner.dashboard.historyItem")}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {c.public_ref} · {new Date(c.earned_at).toLocaleDateString()}
                </p>
                {c.status === "pending" ? (
                  <p className="mt-1 text-xs text-gray-500">
                    {t(dict, "partner.dashboard.expectedConfirmLabel")}:{" "}
                    {expectedConfirmationDate(c.earned_at, lang)}
                  </p>
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
    </div>
  );
}
