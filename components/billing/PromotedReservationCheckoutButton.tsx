"use client";

import { useState } from "react";
import { t, type Dictionary } from "@/lib/i18n";
import CheckoutLegalDisclosure from "@/components/billing/CheckoutLegalDisclosure";
import type { LegalPublicLang } from "@/content/legal/types";

type Props = {
  lang: string;
  dict: Dictionary;
  publicToken: string;
  disabled?: boolean;
};

export default function PromotedReservationCheckoutButton({
  lang,
  dict,
  publicToken,
  disabled = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/billing/promoted-reservation/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang, public_token: publicToken }),
      });

      const data: unknown = await res.json().catch(() => null);
      const errorCode =
        data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? data.error
          : null;

      if (
        res.ok &&
        data &&
        typeof data === "object" &&
        "checkout_url" in data &&
        typeof data.checkout_url === "string"
      ) {
        setRedirecting(true);
        window.location.assign(data.checkout_url);
        return;
      }

      if (errorCode === "payments_unavailable") {
        setMessage(t(dict, "serviceRequestPromotion.accept.checkout.unavailable"));
        return;
      }

      setMessage(t(dict, "serviceRequestPromotion.accept.checkout.genericError"));
    } catch {
      setMessage(t(dict, "serviceRequestPromotion.accept.checkout.genericError"));
    } finally {
      setLoading(false);
    }
  }

  const label = redirecting
    ? t(dict, "serviceRequestPromotion.accept.checkout.redirecting")
    : loading
      ? t(dict, "serviceRequestPromotion.accept.checkout.loading")
      : t(dict, "serviceRequestPromotion.accept.cta");

  return (
    <div className="space-y-3">
      <CheckoutLegalDisclosure lang={lang as LegalPublicLang} planCode="promoted_request" />
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={disabled || loading || redirecting}
        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {label}
      </button>
      {message ? (
        <p className="text-sm leading-relaxed text-gray-600" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
