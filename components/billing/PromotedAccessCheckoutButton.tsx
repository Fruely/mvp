"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { t, type Dictionary } from "@/lib/i18n";
import CheckoutLegalDisclosure from "@/components/billing/CheckoutLegalDisclosure";
import type { LegalPublicLang } from "@/content/legal/types";

type Props = {
  lang: string;
  dict: Dictionary;
  disabled?: boolean;
};

export default function PromotedAccessCheckoutButton({ lang, dict, disabled = false }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/billing/promoted-access/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang }),
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

      if (errorCode === "already_has_access" || errorCode === "subscription_access") {
        router.refresh();
        return;
      }

      if (errorCode === "payments_unavailable") {
        setMessage(t(dict, "dashboard.promotedRequestPage.checkout.unavailable"));
        return;
      }

      if (errorCode === "not_eligible") {
        setMessage(t(dict, "dashboard.promotedRequestPage.checkout.notEligible"));
        return;
      }

      if (res.status === 401) {
        setMessage(t(dict, "dashboard.promotedRequestPage.checkout.unauthorized"));
        return;
      }

      setMessage(t(dict, "dashboard.promotedRequestPage.checkout.genericError"));
    } catch {
      setMessage(t(dict, "dashboard.promotedRequestPage.checkout.genericError"));
    } finally {
      setLoading(false);
    }
  }

  const label = redirecting
    ? t(dict, "dashboard.promotedRequestPage.checkout.redirecting")
    : loading
      ? t(dict, "dashboard.promotedRequestPage.checkout.loading")
      : t(dict, "dashboard.promotedRequestPage.checkout.cta");

  return (
    <div className="space-y-2">
      <CheckoutLegalDisclosure
        lang={lang as LegalPublicLang}
        planCode="promoted_request"
      />
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={disabled || loading || redirecting}
        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
