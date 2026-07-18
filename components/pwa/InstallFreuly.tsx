"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { INSTALL_SHARED_COPY, resolveInstallMessage } from "@/lib/pwa/installCopy";
import {
  INSTALL_DISMISS_KEY,
  INSTALL_DONE_KEY,
  classifyPlatform,
  parseDismissedAt,
  shouldShowInstallCta,
  type InstallAudience,
  type InstallPlacement,
  type InstallVariant,
  type PlatformCategory,
} from "@/lib/pwa/installLogic";
import { trackPwaInstallEvent } from "@/lib/pwa/installAnalytics";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function readStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const displayStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    typeof (navigator as Navigator & { standalone?: boolean }).standalone === "boolean" &&
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return displayStandalone || iosStandalone;
}

function readDisplayMode(): string {
  if (typeof window === "undefined") return "unknown";
  if (readStandalone()) return "standalone";
  if (window.matchMedia("(display-mode: browser)").matches) return "browser";
  return "browser";
}

function analyticsBase(input: {
  placement: InstallPlacement;
  audience: InstallAudience;
  lang: Lang;
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  platform: PlatformCategory;
  variant: InstallVariant;
}) {
  return {
    placement: input.placement,
    audience: input.audience,
    language: input.lang,
    source: input.source,
    medium: input.medium,
    campaign: input.campaign,
    content: input.content,
    display_mode: readDisplayMode(),
    platform: input.platform,
    variant: input.variant,
  };
}

export default function InstallFreuly({
  lang,
  audience = "client",
  placement,
  variant = "card",
  source,
  medium,
  campaign,
  content,
  className = "",
}: {
  lang: Lang;
  audience?: InstallAudience;
  placement: InstallPlacement;
  variant?: InstallVariant;
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  className?: string;
}) {
  const shared = INSTALL_SHARED_COPY[lang];
  const message = resolveInstallMessage(lang, audience, placement);
  const titleId = useId();
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<PlatformCategory>("unknown");
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const viewedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const refreshVisibility = (canPrompt: boolean, plat: PlatformCategory) => {
      const dismissedAt = parseDismissedAt(window.localStorage.getItem(INSTALL_DISMISS_KEY));
      const installedFlag = window.localStorage.getItem(INSTALL_DONE_KEY) === "1";
      const show = shouldShowInstallCta({
        isStandalone: readStandalone(),
        installedFlag,
        dismissedAtMs: dismissedAt,
        nowMs: Date.now(),
        canPrompt,
        platform: plat,
        allowUnsupportedHint: placement === "install_page",
      });
      setVisible(show);
    };

    const plat = classifyPlatform({
      userAgent: navigator.userAgent,
      maxTouchPoints: navigator.maxTouchPoints,
      hasBeforeInstallPromptApi: "onbeforeinstallprompt" in window,
    });
    setPlatform(plat);
    refreshVisibility(Boolean(deferredRef.current), plat);

    const onBip = (event: Event) => {
      event.preventDefault();
      deferredRef.current = event as BeforeInstallPromptEvent;
      refreshVisibility(true, plat);
    };

    const onInstalled = () => {
      window.localStorage.setItem(INSTALL_DONE_KEY, "1");
      deferredRef.current = null;
      setVisible(false);
      trackPwaInstallEvent(
        "pwa_app_installed",
        analyticsBase({
          placement,
          audience,
          lang,
          source,
          medium,
          campaign,
          content,
          platform: plat,
          variant,
        })
      );
    };

    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [audience, campaign, content, lang, medium, placement, source, variant]);

  useEffect(() => {
    if (!visible || viewedRef.current) return;
    viewedRef.current = true;
    trackPwaInstallEvent(
      "pwa_install_cta_view",
      analyticsBase({
        placement,
        audience,
        lang,
        source,
        medium,
        campaign,
        content,
        platform,
        variant,
      })
    );
  }, [visible, audience, campaign, content, lang, medium, placement, platform, source, variant]);

  if (!visible) return null;

  const canPrompt = Boolean(deferredRef.current);
  const isIos = platform === "ios";
  const canOfferAction = canPrompt || isIos;
  const primaryLabel = canPrompt || !isIos ? message.cta : shared.ctaHow;

  const track = (name: Parameters<typeof trackPwaInstallEvent>[0]) => {
    trackPwaInstallEvent(
      name,
      analyticsBase({
        placement,
        audience,
        lang,
        source,
        medium,
        campaign,
        content,
        platform,
        variant,
      })
    );
  };

  const onDismiss = () => {
    window.localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
    setVisible(false);
    setShowIosHelp(false);
    track("pwa_install_dismissed");
  };

  const onPrimary = async () => {
    track("pwa_install_cta_click");

    if (canPrompt && deferredRef.current) {
      setBusy(true);
      try {
        track("pwa_install_prompt_shown");
        await deferredRef.current.prompt();
        const choice = await deferredRef.current.userChoice;
        deferredRef.current = null;
        if (choice.outcome === "accepted") {
          window.localStorage.setItem(INSTALL_DONE_KEY, "1");
          setVisible(false);
          track("pwa_install_accepted");
        } else {
          track("pwa_install_dismissed");
        }
      } finally {
        setBusy(false);
      }
      return;
    }

    if (isIos) {
      setShowIosHelp(true);
      track("pwa_ios_instructions_opened");
    }
  };

  const shell =
    variant === "button"
      ? "inline-flex"
      : variant === "compact"
        ? "rounded-xl border border-[#DDE1FF] bg-[#F7F8FF] p-3"
        : variant === "dashboard"
          ? "rounded-2xl border border-[#F3C79C] bg-gradient-to-br from-[#FFF7ED] to-[#FFF0E4] p-4"
          : variant === "landing"
            ? "rounded-2xl border border-[#DDE1FF] bg-white p-4"
            : "rounded-2xl border border-[#DDE1FF] bg-white p-4";

  if (variant === "button") {
    if (!canOfferAction) return null;
    return (
      <div className={`${shell} ${className}`}>
        <button
          type="button"
          onClick={() => void onPrimary()}
          disabled={busy}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#4B50E6] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3B3FBF] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4B50E6]"
        >
          {primaryLabel}
        </button>
      </div>
    );
  }

  return (
    <section
      className={`${shell} ${className}`}
      aria-labelledby={titleId}
      data-pwa-install-placement={placement}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={titleId} className="text-sm font-semibold text-gray-900 sm:text-base">
            {message.title}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">{message.body}</p>
          {canPrompt ? (
            <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{shared.androidHint}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-black/[0.04] hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4B50E6]"
          aria-label={shared.dismiss}
        >
          {shared.dismiss}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {canOfferAction ? (
          <button
            type="button"
            onClick={() => void onPrimary()}
            disabled={busy}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-[#4B50E6] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3B3FBF] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4B50E6] sm:flex-none"
          >
            {primaryLabel}
          </button>
        ) : (
          <p className="text-xs leading-relaxed text-gray-500">{shared.unsupportedHint}</p>
        )}
      </div>

      {showIosHelp ? (
        <div
          className="mt-3 rounded-xl bg-[#F7F8FF] p-3 text-sm text-gray-700"
          role="region"
          aria-label={shared.iosTitle}
        >
          <p className="font-semibold text-gray-900">{shared.iosTitle}</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>{shared.iosStepShare}</li>
            <li>{shared.iosStepHome}</li>
            <li>{shared.iosStepAdd}</li>
          </ol>
          <button
            type="button"
            className="mt-2 text-xs font-semibold text-[#4B50E6] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4B50E6]"
            onClick={() => setShowIosHelp(false)}
          >
            {shared.closeInstructions}
          </button>
        </div>
      ) : null}
    </section>
  );
}
