"use client";

import { useState } from "react";
import Link from "next/link";
import type { AgreementBlock } from "@/content/partners/agreement";
import { t, type Dictionary } from "@/lib/i18n";

type Props = {
  lang: string;
  dict: Dictionary;
  version: string;
  title: string;
  disclaimer: string;
  blocks: AgreementBlock[];
  alreadyAccepted: boolean;
};

export default function PartnerAgreementClient({
  lang,
  dict,
  version,
  title,
  disclaimer,
  blocks,
  alreadyAccepted,
}: Props) {
  const [checked, setChecked] = useState(alreadyAccepted);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    if (!checked) {
      setError(t(dict, "partner.agreement.needCheck"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/partner/agreement/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: true, agreement_version: version }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof json.error === "string"
            ? json.error
            : t(dict, "partner.agreement.error")
        );
        return;
      }
      window.location.assign(`/${lang}/partners/payout-onboarding`);
    } catch {
      setError(t(dict, "partner.agreement.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <header className="space-y-2">
        <p className="text-sm font-medium text-indigo-700">
          {t(dict, "partner.agreement.versionLabel")}: {version}
        </p>
        <h1 className="text-3xl font-semibold text-gray-900">{title}</h1>
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {disclaimer}
        </p>
      </header>

      <article className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        {blocks.map((block, index) => {
          if (block.type === "h2") {
            return (
              <h2 key={index} className="text-lg font-semibold text-gray-900">
                {block.text}
              </h2>
            );
          }
          if (block.type === "ul") {
            return (
              <ul key={index} className="list-disc space-y-1 pl-5 text-gray-700">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );
          }
          return (
            <p key={index} className="text-gray-700 leading-relaxed">
              {block.text}
            </p>
          );
        })}
      </article>

      {alreadyAccepted ? (
        <div className="space-y-3">
          <p className="text-sm text-emerald-700">{t(dict, "partner.agreement.alreadyAccepted")}</p>
          <Link
            href={`/${lang}/partners/payout-onboarding`}
            className="inline-flex rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            {t(dict, "partner.agreement.continue")}
          </Link>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
          <label className="flex items-start gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              className="mt-1"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <span>{t(dict, "partner.agreement.checkbox")}</span>
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="button"
            disabled={loading || !checked}
            onClick={() => void accept()}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading
              ? t(dict, "partner.agreement.submitting")
              : t(dict, "partner.agreement.submit")}
          </button>
        </div>
      )}
    </div>
  );
}
