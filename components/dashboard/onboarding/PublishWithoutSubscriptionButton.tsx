"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@/components/ui";

const PUBLISH_PATH = "/api/specialist/dashboard/publish";

export default function PublishWithoutSubscriptionButton({
  lang,
  enabled,
  publishLabel,
  publishingLabel,
  errorLabel,
}: {
  lang: string;
  enabled: boolean;
  publishLabel: string;
  publishingLabel: string;
  errorLabel: string;
}) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publishWithoutSubscription() {
    if (!enabled || publishing) return;

    setPublishing(true);
    setError(null);

    try {
      const response = await fetch(PUBLISH_PATH, { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as {
        success?: unknown;
        status?: unknown;
        error?: unknown;
        fields?: unknown;
      };

      if (!response.ok || payload.success !== true) {
        const fields = Array.isArray(payload.fields)
          ? payload.fields.filter((field): field is string => typeof field === "string").join(", ")
          : "";
        setError(fields ? `${errorLabel}: ${fields}` : errorLabel);
        return;
      }

      router.push(`/${lang}/specialist/dashboard`);
      router.refresh();
    } catch {
      setError(errorLabel);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-freuly-3">
      <Button
        type="button"
        className="w-full sm:w-auto"
        disabled={!enabled || publishing}
        onClick={() => void publishWithoutSubscription()}
      >
        {publishing ? publishingLabel : publishLabel}
      </Button>
      {error ? <Alert variant="error">{error}</Alert> : null}
    </div>
  );
}
