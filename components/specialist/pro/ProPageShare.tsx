"use client";

import { useMemo, useState } from "react";
import { Share2 } from "lucide-react";
import { buildProPageSharePayload, resolveProPageShareAction } from "@/lib/specialists/proPage/share";

type ProPageShareProps = {
  url: string;
  title: string;
  text: string;
  label: string;
  copiedLabel: string;
};

export default function ProPageShare({ url, title, text, label, copiedLabel }: ProPageShareProps) {
  const [copied, setCopied] = useState(false);
  const payload = useMemo(() => buildProPageSharePayload({ url, title, text }), [url, title, text]);
  const action = useMemo(() => resolveProPageShareAction(typeof navigator !== "undefined" ? navigator : null), []);

  async function handleShare() {
    if (action === "native" && typeof navigator.share === "function") {
      try {
        await navigator.share(payload);
      } catch {
        /* cancelled */
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(payload.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#E3DDD5] bg-freuly-surface px-5 py-3.5 text-sm font-semibold text-freuly-primary transition-colors freuly-focus-ring hover:border-freuly-primary md:w-auto md:border-freuly-primary md:bg-freuly-primary-light md:px-6"
    >
      <Share2 className="size-3.5 shrink-0 text-freuly-primary" aria-hidden />
      {copied ? copiedLabel : label}
    </button>
  );
}
