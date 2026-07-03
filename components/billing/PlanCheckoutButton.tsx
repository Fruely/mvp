"use client";

import { useState } from "react";
import { t, type Dictionary } from "@/lib/i18n";
import type { PaidPlanCode } from "@/lib/billing/plans";

type Props = {
  planCode: PaidPlanCode;
  lang: string;
  dict: Dictionary;
  className?: string;
};

export default function PlanCheckoutButton({ planCode, lang, dict, className }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_code: planCode, lang }),
      });

      const data: unknown = await res.json().catch(() => null);
      const errorCode =
        data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? data.error
          : null;

      if (res.ok && data && typeof data === "object" && "url" in data && typeof data.url === "string") {
        window.location.href = data.url;
        return;
      }

      if (errorCode === "payments_disabled") {
        setMessage(t(dict, "dashboard.billingPage.checkout.paymentsDisabled"));
        return;
      }
      if (errorCode === "provider_not_configured") {
        setMessage(t(dict, "dashboard.billingPage.checkout.providerNotConfigured"));
        return;
      }
      if (res.status === 401) {
        setMessage(t(dict, "dashboard.billingPage.checkout.unauthorized"));
        return;
      }

      setMessage(t(dict, "dashboard.billingPage.checkout.genericError"));
    } catch {
      setMessage(t(dict, "dashboard.billingPage.checkout.genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={loading}
        className={
          className ??
          "inline-flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {loading
          ? t(dict, "dashboard.billingPage.checkout.loading")
          : t(dict, "dashboard.billingPage.checkout.cta")}
      </button>
      {message ? (
        <p className="text-sm leading-relaxed text-gray-600" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
