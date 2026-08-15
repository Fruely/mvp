"use client";

import {
  buildAdminReferralUrl,
  copyTextToClipboard,
} from "@/lib/admin/partnerAdminUi";

export default function AdminReferralLinkActions({
  referralCode,
  compact = false,
}: {
  referralCode: string;
  compact?: boolean;
}) {
  const url = buildAdminReferralUrl(referralCode);

  async function handleCopy() {
    const ok = await copyTextToClipboard(url);
    if (!ok) {
      window.prompt("Скопируйте ссылку:", url);
    }
  }

  if (!url) return null;

  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <div className="break-all font-mono text-xs text-gray-700">{url}</div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50"
          onClick={() => void handleCopy()}
        >
          Скопировать ссылку
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-gray-50"
        >
          Открыть ссылку
        </a>
      </div>
    </div>
  );
}
