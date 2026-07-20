"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  COOKIE_CONSENT_CHANGE_EVENT,
  COOKIE_CONSENT_OPEN_EVENT,
  createCookieConsent,
  type CookieConsent,
} from "@/lib/consent/cookieConsent";
import { getCookieConsentCopy } from "@/lib/consent/cookieConsentCopy";
import {
  readFreulyLangCookie,
  resolveConsentLang,
} from "@/lib/consent/cookieConsentLang";

function readSavedConsent(): CookieConsent | null {
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    return {
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
      externalMedia: parsed.externalMedia === true,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
    };
  } catch {
    return null;
  }
}

export default function CookieConsentBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [externalMedia, setExternalMedia] = useState(false);
  const [freulyLangCookie, setFreulyLangCookie] = useState<string | null>(null);

  const consentLang = useMemo(
    () => resolveConsentLang(pathname, freulyLangCookie),
    [pathname, freulyLangCookie]
  );
  const copy = useMemo(() => getCookieConsentCopy(consentLang), [consentLang]);

  useEffect(() => {
    setFreulyLangCookie(readFreulyLangCookie());

    const saved = readSavedConsent();
    if (!saved) {
      setVisible(true);
    } else {
      setAnalytics(saved.analytics);
      setMarketing(saved.marketing);
      setExternalMedia(saved.externalMedia);
    }

    const openCookieSettings = () => {
      const current = readSavedConsent();
      if (current) {
        setAnalytics(current.analytics);
        setMarketing(current.marketing);
        setExternalMedia(current.externalMedia);
      }
      setSettingsOpen(true);
      setVisible(true);
    };

    const onStorage = () => {
      setFreulyLangCookie(readFreulyLangCookie());
    };

    window.addEventListener(COOKIE_CONSENT_OPEN_EVENT, openCookieSettings);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(COOKIE_CONSENT_OPEN_EVENT, openCookieSettings);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Keep freuly_lang in sync when LanguageBar rewrites the cookie on same tab.
  useEffect(() => {
    setFreulyLangCookie(readFreulyLangCookie());
  }, [pathname]);

  function saveConsent(values: {
    analytics: boolean;
    marketing: boolean;
    externalMedia: boolean;
  }) {
    const consent = createCookieConsent(values);
    window.localStorage.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify(consent)
    );
    window.dispatchEvent(new Event(COOKIE_CONSENT_CHANGE_EVENT));
    setAnalytics(values.analytics);
    setMarketing(values.marketing);
    setExternalMedia(values.externalMedia);
    setSettingsOpen(false);
    setVisible(false);
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1000] max-w-[100%] px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-4xl min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">{copy.title}</h2>
          {settingsOpen ? (
            <button
              type="button"
              className="shrink-0 rounded-full px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
              onClick={() => {
                if (readSavedConsent()) {
                  setVisible(false);
                  setSettingsOpen(false);
                } else {
                  setSettingsOpen(false);
                }
              }}
            >
              {copy.close}
            </button>
          ) : null}
        </div>

        <p className="mt-2 text-sm leading-relaxed text-slate-600">{copy.body}</p>

        <a
          href={copy.privacyHref}
          className="mt-2 inline-block text-sm underline underline-offset-4"
        >
          {copy.privacyLink}
        </a>

        {settingsOpen ? (
          <div
            className="mt-4 grid gap-3 text-sm text-slate-700"
            role="group"
            aria-label={copy.settingsAria}
          >
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <label className="flex items-start gap-2">
                <input type="checkbox" checked disabled className="mt-1" />
                <span>
                  <span className="font-semibold">{copy.necessaryTitle}</span>
                  <span className="ml-2 text-xs font-medium text-slate-500">
                    ({copy.necessaryAlwaysOn})
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {copy.necessaryDescription}
                  </span>
                </span>
              </label>
            </div>

            <label className="flex items-start gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={analytics}
                onChange={(event) => setAnalytics(event.target.checked)}
              />
              <span>
                <span className="font-semibold">{copy.analyticsTitle}</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {copy.analyticsDescription}
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={marketing}
                onChange={(event) => setMarketing(event.target.checked)}
              />
              <span>
                <span className="font-semibold">{copy.marketingTitle}</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {copy.marketingDescription}
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={externalMedia}
                onChange={(event) => setExternalMedia(event.target.checked)}
              />
              <span>
                <span className="font-semibold">{copy.externalMediaTitle}</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {copy.externalMediaDescription}
                </span>
              </span>
            </label>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold leading-snug"
            onClick={() =>
              saveConsent({
                analytics: false,
                marketing: false,
                externalMedia: false,
              })
            }
          >
            {copy.rejectOptional}
          </button>

          {!settingsOpen ? (
            <button
              type="button"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold leading-snug"
              onClick={() => setSettingsOpen(true)}
            >
              {copy.settings}
            </button>
          ) : null}

          <button
            type="button"
            className="rounded-full bg-[#4B50E6] px-4 py-2 text-sm font-semibold leading-snug text-white"
            onClick={() => {
              if (settingsOpen) {
                saveConsent({ analytics, marketing, externalMedia });
                return;
              }

              saveConsent({
                analytics: true,
                marketing: true,
                externalMedia: true,
              });
            }}
          >
            {settingsOpen ? copy.saveSelection : copy.acceptAll}
          </button>
        </div>
      </div>
    </div>
  );
}
