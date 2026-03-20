"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { t, type Dictionary } from "@/lib/i18n";

type Props = {
  status: string | null | undefined;
  dict: Dictionary;
};

export default function VerificationBanner({ status, dict }: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (status !== "published_unverified") return null;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError(t(dict, "dashboard.verification.selectFile"));
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/specialist/verification/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : t(dict, "dashboard.verification.uploadFailed"));
        return;
      }

      setSuccess(t(dict, "dashboard.verification.uploadSuccess"));
      setFile(null);
      setOpen(false);
    } catch {
      setError(t(dict, "dashboard.verification.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-medium text-amber-900">
        {t(dict, "dashboard.verification.published")}
      </p>
      <p className="mt-1 text-sm text-amber-800">
        {t(dict, "dashboard.verification.recommendedHint")}
      </p>

      <div className="mt-3">
        <button
          type="button"
          onClick={() => {
            setOpen((prev) => !prev);
            setError(null);
            setSuccess(null);
          }}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
        >
          {t(dict, "dashboard.verification.uploadDocuments")}
        </button>
      </div>

      <div className="mt-3 space-y-1">
        <p className="text-xs text-amber-800">{t(dict, "dashboard.helpers.verification.line1")}</p>
        <ul className="text-xs text-amber-800 list-disc list-inside">
          <li>{t(dict, "dashboard.helpers.verification.bullet1")}</li>
          <li>{t(dict, "dashboard.helpers.verification.bullet2")}</li>
        </ul>
        <p className="text-xs text-amber-700 mt-1">{t(dict, "dashboard.helpers.verification.footer")}</p>
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <input type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png,.pdf,application/pdf" onChange={handleFileChange} />
          <div>
            <button
              type="submit"
              disabled={!file || uploading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {uploading ? t(dict, "dashboard.buttons.uploading") : t(dict, "dashboard.buttons.submitDocument")}
            </button>
          </div>
        </form>
      )}

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {success ? <p className="mt-2 text-sm text-green-700">{success}</p> : null}
    </div>
  );
}
