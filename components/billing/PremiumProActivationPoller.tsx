"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui";
import { dashboardLinkSecondaryClass } from "@/components/dashboard/dashboardStyles";

const POLL_INTERVAL_MS = 1500;
const TIMEOUT_MS = 45000;

type Props = {
  proPageHref: string;
  billingHref: string;
  activatingLabel: string;
  timeoutLabel: string;
  backToBillingLabel: string;
};

export default function PremiumProActivationPoller({
  proPageHref,
  billingHref,
  activatingLabel,
  timeoutLabel,
  backToBillingLabel,
}: Props) {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    async function pollEntitlement(): Promise<boolean> {
      const response = await fetch("/api/specialist/pro-page/entitlement", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) return false;
      const payload = (await response.json()) as { active?: unknown };
      return payload.active === true;
    }

    async function run() {
      while (!cancelled) {
        try {
          if (await pollEntitlement()) {
            router.replace(proPageHref);
            return;
          }
        } catch {
          // Keep polling until timeout — webhook may still be in flight.
        }

        if (Date.now() - startedAt >= TIMEOUT_MS) {
          setTimedOut(true);
          return;
        }

        await new Promise((resolve) => {
          window.setTimeout(resolve, POLL_INTERVAL_MS);
        });
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [proPageHref, router]);

  if (timedOut) {
    return (
      <Alert variant="info">
        <p>{timeoutLabel}</p>
        <p className="mt-freuly-3">
          <Link href={billingHref} className={dashboardLinkSecondaryClass}>
            {backToBillingLabel}
          </Link>
        </p>
      </Alert>
    );
  }

  return <Alert variant="info">{activatingLabel}</Alert>;
}
