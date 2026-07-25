"use client";

import { useState } from "react";
import Link from "next/link";
import { t, type Dictionary } from "@/lib/i18n";
import type { StripeConnectAccountState } from "@/lib/partners/stripeConnect";

type Props = {
  lang: string;
  dict: Dictionary;
  payoutsEnabled: boolean;
  connect: StripeConnectAccountState;
  referralCode: string;
};

export default function PartnerPayoutOnboardingClient({
  lang,
  dict,
  payoutsEnabled,
  connect,
  referralCode,
}: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function startConnect() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/partner/stripe-connect/start?lang=${lang}`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (json.ok && typeof json.url === "string") {
        window.location.assign(json.url);
        return;
      }
      setMessage(
        typeof json.message === "string"
          ? json.message
          : t(dict, "partner.payout.disabledBody")
      );
    } catch {
      setMessage(t(dict, "partner.payout.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">
          {t(dict, "partner.payout.title")}
        </h1>
        <p className="text-sm text-gray-600">{t(dict, "partner.payout.subtitle")}</p>
      </header>

      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">
          {t(dict, "partner.payout.statusTitle")}
        </h2>
        <ul className="space-y-1 text-sm text-gray-700">
          <li>
            {t(dict, "partner.payout.liveLabel")}:{" "}
            <strong>{payoutsEnabled ? t(dict, "partner.payout.on") : t(dict, "partner.payout.off")}</strong>
          </li>
          <li>
            {t(dict, "partner.payout.connectLabel")}:{" "}
            <strong>{connect.onboardingStatus}</strong>
          </li>
          <li>
            {t(dict, "partner.payout.referralReady")}:{" "}
            <strong>/r/{referralCode}</strong>
          </li>
        </ul>
        {!payoutsEnabled ? (
          <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            {t(dict, "partner.payout.disabledBody")}
          </p>
        ) : null}
        {message ? <p className="text-sm text-gray-700">{message}</p> : null}
        <button
          type="button"
          onClick={() => void startConnect()}
          disabled={loading}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-800 disabled:opacity-60"
        >
          {loading
            ? t(dict, "partner.payout.starting")
            : t(dict, "partner.payout.startConnect")}
        </button>
      </section>

      <Link
        href={`/${lang}/partner/dashboard`}
        className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
      >
        {t(dict, "partner.payout.openDashboard")}
      </Link>
    </div>
  );
}
