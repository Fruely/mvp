"use client";

import { useState, useCallback } from "react";

type ShareTarget = "facebook" | "linkedin" | "x" | "telegram" | "whatsapp";

const SHARE_LABELS: Record<ShareTarget | "copy" | "share", string> = {
  facebook: "Facebook",
  linkedin: "LinkedIn",
  x: "X",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  copy: "Скопировать ссылку",
  share: "Поделиться",
};

function buildShareUrl(target: ShareTarget, url: string, title: string): string {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  switch (target) {
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
    case "x":
      return `https://x.com/intent/tweet?url=${u}&text=${t}`;
    case "telegram":
      return `https://t.me/share/url?url=${u}&text=${t}`;
    case "whatsapp":
      return `https://api.whatsapp.com/send?text=${t}%20${u}`;
  }
}

const TARGETS: ShareTarget[] = ["facebook", "linkedin", "x", "telegram", "whatsapp"];

export function ArticleShareBlock({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const [hasNativeShare] = useState(() =>
    typeof window !== "undefined" && typeof navigator.share === "function"
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [url]);

  const handleNativeShare = useCallback(async () => {
    try {
      await navigator.share({ title, url });
    } catch {
      /* user cancelled or not supported */
    }
  }, [title, url]);

  return (
    <div className="border-t border-freuly-border-default pt-8">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-freuly-text-secondary">
        Поделиться
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {hasNativeShare && (
          <button
            type="button"
            onClick={handleNativeShare}
            className="h-[36px] rounded-freuly-button border border-freuly-border-default px-4 text-[13px] font-medium text-freuly-text-primary hover:bg-freuly-page"
          >
            {SHARE_LABELS.share}
          </button>
        )}

        {TARGETS.map((target) => (
          <a
            key={target}
            href={buildShareUrl(target, url, title)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-[36px] items-center rounded-freuly-button border border-freuly-border-default px-4 text-[13px] font-medium text-freuly-text-primary hover:bg-freuly-page"
          >
            {SHARE_LABELS[target]}
          </a>
        ))}

        <button
          type="button"
          onClick={handleCopy}
          className="h-[36px] rounded-freuly-button border border-freuly-border-default px-4 text-[13px] font-medium text-freuly-primary hover:bg-freuly-page"
        >
          {copied ? "Ссылка скопирована ✓" : SHARE_LABELS.copy}
        </button>
      </div>
    </div>
  );
}
