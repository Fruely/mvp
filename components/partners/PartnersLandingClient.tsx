"use client";

import { useState } from "react";
import Link from "next/link";
import { isSupportedLang, t, type Dictionary, type Lang } from "@/lib/i18n";
import { privacyPath } from "@/lib/legal/paths";

type Props = {
  lang: string;
  dict: Dictionary;
  /** bound partner view for logged-in visitors */
  partnerState?: "none" | "continue" | "dashboard";
};

export default function PartnersLandingClient({
  lang,
  dict,
  partnerState = "none",
}: Props) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    channel_name: "",
    channel_url: "",
    extra_links: "",
    platform: "",
    topic: "",
    audience_lang: "",
    audience_geo: "",
    subscribers_approx: "",
    reach_approx: "",
    comment: "",
    privacy_accepted: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const howSteps = (t(dict, "partner.public.howSteps", { defaultValue: "" }) || "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  const audience = (t(dict, "partner.public.audienceItems", { defaultValue: "" }) || "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/partners/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          extra_links: form.extra_links,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof json.error === "string"
            ? json.error
            : t(dict, "partner.form.error", { defaultValue: "Error" })
        );
        return;
      }
      setDone(true);
    } catch {
      setError(t(dict, "partner.form.error", { defaultValue: "Error" }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-12">
      <header className="space-y-3">
        <p className="text-sm font-semibold tracking-wide text-indigo-700">Freuly Partner</p>
        <h1 className="text-3xl font-semibold text-gray-900 sm:text-4xl">
          {t(dict, "partner.public.title")}
        </h1>
        <p className="text-base text-gray-600 leading-relaxed">
          {t(dict, "partner.public.subtitle")}
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          {partnerState === "dashboard" ? (
            <Link
              href={`/${lang}/partner/dashboard`}
              className="inline-flex rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              {t(dict, "partner.public.openDashboard")}
            </Link>
          ) : partnerState === "continue" ? (
            <Link
              href={`/${lang}/partners/onboarding`}
              className="inline-flex rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              {t(dict, "partner.public.continueOnboarding")}
            </Link>
          ) : (
            <Link
              href={`/${lang}/partners/onboarding`}
              className="inline-flex rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              {t(dict, "partner.public.becomeCta")}
            </Link>
          )}
          <Link
            href={`/${lang}/partners/agreement`}
            className="inline-flex rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-800"
          >
            {t(dict, "partner.public.agreementLink")}
          </Link>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">
          {t(dict, "partner.public.howTitle")}
        </h2>
        <ol className="list-decimal pl-5 space-y-2 text-gray-700">
          {howSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">
          {t(dict, "partner.public.limitsTitle")}
        </h2>
        <p className="text-gray-700">{t(dict, "partner.public.limitsBody")}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">
          {t(dict, "partner.public.payoutTitle")}
        </h2>
        <p className="text-gray-700">{t(dict, "partner.public.payoutBody")}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">
          {t(dict, "partner.public.rewardTitle")}
        </h2>
        <p className="text-gray-700">{t(dict, "partner.public.rewardBody")}</p>
        <p className="text-sm text-gray-600">{t(dict, "partner.public.rewardNote")}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">
          {t(dict, "partner.public.audienceTitle")}
        </h2>
        <ul className="list-disc pl-5 space-y-1 text-gray-700">
          {audience.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-4" id="apply">
        <h2 className="text-xl font-semibold text-gray-900">{t(dict, "partner.form.title")}</h2>
        {done ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {t(dict, "partner.form.success")}
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
            {(
              [
                ["name", "partner.form.name", "text"],
                ["email", "partner.form.email", "email"],
                ["channel_name", "partner.form.channelName", "text"],
                ["channel_url", "partner.form.channelUrl", "url"],
                ["extra_links", "partner.form.extraLinks", "text"],
                ["platform", "partner.form.platform", "text"],
                ["topic", "partner.form.topic", "text"],
                ["audience_lang", "partner.form.audienceLang", "text"],
                ["audience_geo", "partner.form.audienceGeo", "text"],
                ["subscribers_approx", "partner.form.subscribers", "text"],
                ["reach_approx", "partner.form.reach", "text"],
              ] as const
            ).map(([key, labelKey, type]) => (
              <label key={key} className="block text-sm">
                <span className="font-medium text-gray-700">{t(dict, labelKey)}</span>
                <input
                  type={type}
                  required={key === "name" || key === "email" || key === "channel_name" || key === "channel_url"}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </label>
            ))}
            <label className="block text-sm">
              <span className="font-medium text-gray-700">{t(dict, "partner.form.comment")}</span>
              <textarea
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                rows={3}
                value={form.comment}
                onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
              />
            </label>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.privacy_accepted}
                onChange={(e) => setForm((f) => ({ ...f, privacy_accepted: e.target.checked }))}
                required
              />
              <span>
                {t(dict, "partner.form.privacy")}{" "}
                <Link
                  href={privacyPath(isSupportedLang(lang) ? (lang as Lang) : "de")}
                  className="underline underline-offset-2 hover:opacity-80"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t(dict, "footer.privacyLink")}
                </Link>
              </span>
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting
                ? t(dict, "partner.form.submitting")
                : t(dict, "partner.form.submit")}
            </button>
          </form>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">{t(dict, "partner.public.faqTitle")}</h2>
        <Faq lang={lang} dict={dict} />
      </section>
    </div>
  );
}

function Faq({ dict }: { lang: string; dict: Dictionary }) {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => ({
    q: t(dict, `partner.faq.q${i}`),
    a: t(dict, `partner.faq.a${i}`),
  }));
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <details key={item.q} className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <summary className="cursor-pointer font-medium text-gray-900">{item.q}</summary>
          <p className="mt-2 text-sm text-gray-600">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
