"use client";

import { useCallback, useEffect, useState } from "react";
import { t, type Dictionary } from "@/lib/i18n";

type ContractDoc = {
  id: string;
  agreement_version: string;
  agreement_locale: string;
  accepted_at: string;
  issued_at: string | null;
  document_number: string;
  status: string;
  emailed_at: string | null;
};

export default function PartnerContractSection({
  lang,
  dict,
}: {
  lang: string;
  dict: Dictionary;
}) {
  const [documents, setDocuments] = useState<ContractDoc[]>([]);
  const [emailAvailable, setEmailAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/partner/contract", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setDocuments((json.documents ?? []) as ContractDoc[]);
        setEmailAvailable(Boolean(json.email_available));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(
        lang === "de" ? "de-DE" : lang === "ru" ? "ru-RU" : "uk-UA"
      );
    } catch {
      return iso;
    }
  }

  async function downloadDoc(id: string) {
    setActionId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/partner/contract/${id}/download`, { cache: "no-store" });
      if (!res.ok) {
        setMessage(t(dict, "partner.dashboard.contractDownloadError"));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `freuly-partner-contract.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage(t(dict, "partner.dashboard.contractDownloadError"));
    } finally {
      setActionId(null);
    }
  }

  async function resendEmail(id: string) {
    setActionId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/partner/contract/${id}/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: lang }),
      });
      if (!res.ok) {
        setMessage(t(dict, "partner.dashboard.contractEmailError"));
        return;
      }
      setMessage(t(dict, "partner.dashboard.contractEmailSent"));
      await load();
    } catch {
      setMessage(t(dict, "partner.dashboard.contractEmailError"));
    } finally {
      setActionId(null);
    }
  }

  if (loading) return null;
  if (!documents.length) return null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-900">
        {t(dict, "partner.dashboard.contractsTitle")}
      </h2>
      {documents.map((doc) => (
        <div key={doc.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2">
          <p className="text-xs text-gray-500">
            {t(dict, "partner.dashboard.contractVersion")}: {doc.agreement_version}
          </p>
          <p className="text-xs text-gray-600">
            {t(dict, "partner.dashboard.contractAccepted")}: {formatDate(doc.accepted_at)}
          </p>
          <p className="font-mono text-xs text-gray-800">{doc.document_number}</p>
          <p className="text-xs text-gray-500">
            {t(dict, `partner.dashboard.contractStatus.${doc.status}`, {
              defaultValue: doc.status,
            })}
          </p>
          <div className="flex flex-wrap gap-2">
            {doc.status === "issued" ? (
              <button
                type="button"
                disabled={actionId === doc.id}
                onClick={() => void downloadDoc(doc.id)}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {t(dict, "partner.dashboard.contractDownload")}
              </button>
            ) : null}
            {doc.status === "issued" && emailAvailable ? (
              <button
                type="button"
                disabled={actionId === doc.id}
                onClick={() => void resendEmail(doc.id)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 disabled:opacity-50"
              >
                {t(dict, "partner.dashboard.contractResendEmail")}
              </button>
            ) : null}
          </div>
        </div>
      ))}
      {message ? <p className="text-xs text-indigo-700">{message}</p> : null}
    </section>
  );
}
