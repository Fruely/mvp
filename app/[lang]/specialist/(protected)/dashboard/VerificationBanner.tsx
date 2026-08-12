"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Alert, Button } from "@/components/ui";
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
    <Alert variant="warning" title={t(dict, "dashboard.verification.published")}>
      <p>{t(dict, "dashboard.verification.recommendedHint")}</p>

      <div className="mt-freuly-3">
        <Button
          type="button"
          variant="primary"
          className="min-h-[36px] h-9 px-freuly-4 py-1.5 text-freuly-body-sm"
          onClick={() => {
            setOpen((prev) => !prev);
            setError(null);
            setSuccess(null);
          }}
        >
          {t(dict, "dashboard.verification.uploadDocuments")}
        </Button>
      </div>

      <div className="mt-freuly-3 space-y-freuly-1">
        <p>{t(dict, "dashboard.helpers.verification.line1")}</p>
        <ul className="list-inside list-disc">
          <li>{t(dict, "dashboard.helpers.verification.bullet1")}</li>
          <li>{t(dict, "dashboard.helpers.verification.bullet2")}</li>
        </ul>
        <p className="mt-freuly-1">{t(dict, "dashboard.helpers.verification.footer")}</p>
      </div>

      {open ? (
        <form onSubmit={handleSubmit} className="mt-freuly-3 space-y-freuly-3">
          <input
            type="file"
            accept="image/jpeg,image/png,.jpg,.jpeg,.png,.pdf,application/pdf"
            onChange={handleFileChange}
            className="block w-full max-w-full text-freuly-body-sm text-freuly-text-primary file:mr-freuly-3 file:rounded-freuly-md file:border file:border-freuly-border-default file:bg-freuly-surface file:px-freuly-3 file:py-freuly-2 file:text-freuly-body-sm file:font-medium file:text-freuly-text-primary"
          />
          <div>
            <Button
              type="submit"
              variant="secondary"
              disabled={!file || uploading}
              className="min-h-[36px] h-9 px-freuly-4 py-1.5 text-freuly-body-sm"
            >
              {uploading ? t(dict, "dashboard.buttons.uploading") : t(dict, "dashboard.buttons.submitDocument")}
            </Button>
          </div>
        </form>
      ) : null}

      {error ? (
        <Alert variant="error" className="mt-freuly-3">
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert variant="success" className="mt-freuly-3">
          {success}
        </Alert>
      ) : null}
    </Alert>
  );
}
