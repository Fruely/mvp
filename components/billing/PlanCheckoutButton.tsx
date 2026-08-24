"use client";

import { useState } from "react";
import { t, type Dictionary } from "@/lib/i18n";
import { getDemandChannelCopy } from "@/lib/dashboard/demandChannelCopy";
import type { PaidPlanCode } from "@/lib/billing/plans";
import CheckoutLegalDisclosure from "@/components/billing/CheckoutLegalDisclosure";
import { Button } from "@/components/ui";
import type { LegalPublicLang } from "@/content/legal/types";

type Props = {
  planCode: PaidPlanCode;
  lang: string;
  dict: Dictionary;
  checkoutEnabled?: boolean;
  className?: string;
};

export default function PlanCheckoutButton({
  planCode,
  lang,
  dict,
  checkoutEnabled = false,
  className,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const demandCopy = getDemandChannelCopy(lang);

  if (!checkoutEnabled) {
    return (
      <p className="text-xs leading-relaxed text-freuly-text-muted" role="status">
        {t(dict, "dashboard.billingPage.checkout.unavailable")}
      </p>
    );
  }

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
        setRedirecting(true);
        window.location.href = data.url;
        return;
      }

      if (errorCode === "payments_disabled" || errorCode === "checkout_unavailable") {
        setMessage(t(dict, "dashboard.billingPage.checkout.unavailable"));
        return;
      }
      if (errorCode === "provider_not_configured") {
        setMessage(t(dict, "dashboard.billingPage.checkout.unavailable"));
        return;
      }
      if (errorCode === "subscription_already_active") {
        setMessage(t(dict, "dashboard.billingPage.checkout.subscriptionActive"));
        return;
      }
      if (errorCode === "subscription_incomplete") {
        setMessage(t(dict, "dashboard.billingPage.checkout.subscriptionIncomplete"));
        return;
      }
      if (errorCode === "untrusted_fields") {
        setMessage(t(dict, "dashboard.billingPage.checkout.genericError"));
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

  const idleLabel =
    planCode === "basic"
      ? demandCopy.billing.activateProfessional
      : demandCopy.billing.activateGrowth;
  const buttonLabel = redirecting
    ? t(dict, "dashboard.billingPage.checkout.redirecting")
    : loading
      ? t(dict, "dashboard.billingPage.checkout.loading")
      : idleLabel;

  return (
    <div className="space-y-2">
      <CheckoutLegalDisclosure lang={lang as LegalPublicLang} planCode={planCode} />
      <Button
        type="button"
        onClick={() => void handleClick()}
        disabled={loading || redirecting}
        className={className ?? "h-11 w-full px-6"}
      >
        {buttonLabel}
      </Button>
      {message ? (
        <p className="text-sm leading-relaxed text-freuly-text-muted" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
