"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { t, type Dictionary } from "@/lib/i18n";

type Props = {
  url: string;
  code: string;
  dict: Dictionary;
};

export default function PartnerReferralQr({ url, code, dict }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderFailed, setRenderFailed] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas || !url) return;

    setRenderFailed(false);
    void QRCode.toCanvas(canvas, url, {
      width: 160,
      margin: 2,
      color: { dark: "#111827", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).catch(() => {
      if (!cancelled) setRenderFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  async function downloadQr() {
    if (!url || renderFailed) return;
    setDownloading(true);
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 512,
        margin: 2,
        color: { dark: "#111827", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });
      const anchor = document.createElement("a");
      anchor.href = dataUrl;
      anchor.download = `freuly-referral-${code}.png`;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch {
      /* keep link/copy usable; no raw error UI */
    } finally {
      setDownloading(false);
    }
  }

  if (!url) return null;

  return (
    <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
      <p className="text-xs font-medium text-gray-700">
        {t(dict, "partner.dashboard.qrTitle")}
      </p>
      <p className="text-xs text-gray-500">{t(dict, "partner.dashboard.qrDescription")}</p>
      {!renderFailed ? (
        <div className="flex justify-center py-1">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={t(dict, "partner.dashboard.qrAlt")}
            className="rounded-md bg-white p-1 shadow-sm"
          />
        </div>
      ) : null}
      {!renderFailed ? (
        <button
          type="button"
          onClick={() => void downloadQr()}
          disabled={downloading}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 disabled:opacity-50"
        >
          {downloading
            ? t(dict, "partner.dashboard.qrDownloading", { defaultValue: "…" })
            : t(dict, "partner.dashboard.qrDownload")}
        </button>
      ) : null}
    </div>
  );
}
