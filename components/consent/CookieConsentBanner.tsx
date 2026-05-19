"use client";

import { useEffect, useState } from "react";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  COOKIE_CONSENT_OPEN_EVENT,
  createCookieConsent,
} from "@/lib/consent/cookieConsent";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [externalMedia, setExternalMedia] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!saved) {
      setVisible(true);
    }

    const openCookieSettings = () => {
      setSettingsOpen(true);
      setVisible(true);
    };

    window.addEventListener(COOKIE_CONSENT_OPEN_EVENT, openCookieSettings);

    return () => {
      window.removeEventListener(COOKIE_CONSENT_OPEN_EVENT, openCookieSettings);
    };
  }, []);

  function saveConsent(values: {
    analytics: boolean;
    marketing: boolean;
    externalMedia: boolean;
  }) {
    const consent = createCookieConsent(values);
    window.localStorage.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify(consent),
    );
    setVisible(false);
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1000] px-4 pb-4">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h2 className="text-lg font-semibold text-slate-950">
          Cookie-Einstellungen
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Wir verwenden notwendige Technologien für den Betrieb der Website.
          Analyse, Marketing und externe Medien werden nur mit Ihrer Einwilligung
          aktiviert.
        </p>

        <a
          href="/datenschutzerklaerung"
          className="mt-2 inline-block text-sm underline underline-offset-4"
        >
          Datenschutzerklärung
        </a>

        {settingsOpen ? (
          <div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(event) => setAnalytics(event.target.checked)}
              />
              Analyse
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(event) => setMarketing(event.target.checked)}
              />
              Marketing
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={externalMedia}
                onChange={(event) => setExternalMedia(event.target.checked)}
              />
              Externe Medien
            </label>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold"
            onClick={() =>
              saveConsent({
                analytics: false,
                marketing: false,
                externalMedia: false,
              })
            }
          >
            Alle ablehnen
          </button>

          {!settingsOpen ? (
            <button
              type="button"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold"
              onClick={() => setSettingsOpen(true)}
            >
              Einstellungen
            </button>
          ) : null}

          <button
            type="button"
            className="rounded-full bg-[#4B50E6] px-4 py-2 text-sm font-semibold text-white"
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
            {settingsOpen ? "Auswahl speichern" : "Alle akzeptieren"}
          </button>
        </div>
      </div>
    </div>
  );
}
