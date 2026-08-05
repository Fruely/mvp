"use client";

import { useState } from "react";
import Link from "next/link";
import type { AgreementBlock } from "@/content/partners/agreement";
import { t, type Dictionary } from "@/lib/i18n";

type Props = {
  lang: string;
  dict: Dictionary;
  version: string;
  effectiveDate: string;
  title: string;
  governingNote: string | null;
  blocks: AgreementBlock[];
  alreadyAccepted: boolean;
};

export default function PartnerAgreementClient({
  lang,
  dict,
  version,
  effectiveDate,
  title,
  governingNote,
  blocks,
  alreadyAccepted,
}: Props) {
  const [checked, setChecked] = useState(false);
  const [householdChecked, setHouseholdChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    if (!checked) {
      setError(t(dict, "partner.agreement.needCheck"));
      return;
    }
    if (!householdChecked) {
      setError(t(dict, "partner.agreement.needHouseholdCheck"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/partner/agreement/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accepted: true,
          household_rules_accepted: true,
          agreement_version: version,
          agreement_locale: lang,
        }),
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
      window.location.assign(`/${lang}/partner/dashboard`);
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
          {" · "}
          {t(dict, "partner.agreement.effectiveLabel")}: {effectiveDate}
        </p>
        <h1 className="text-3xl font-semibold text-gray-900">{title}</h1>
        {governingNote ? (
          <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
            {governingNote}
          </p>
        ) : null}
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
            href={`/${lang}/partner/dashboard`}
            className="inline-flex rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            {t(dict, "partner.agreement.continue")}
          </Link>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-600">{t(dict, "partner.agreement.payoutSignupHint")}</p>
          <label className="flex items-start gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              className="mt-1"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <span>
              {t(dict, "partner.agreement.checkbox").replace("{{version}}", version)}
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              className="mt-1"
              checked={householdChecked}
              onChange={(e) => setHouseholdChecked(e.target.checked)}
            />
            <span>{t(dict, "partner.agreement.householdCheckbox")}</span>
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="button"
            disabled={loading || !checked || !householdChecked}
            onClick={() => void accept()}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading
              ? t(dict, "partner.agreement.submitting")
              : t(dict, "partner.agreement.joinCta")}
          </button>
        </div>
      )}
    </div>
  );
}
