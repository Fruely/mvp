"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { t, type Dictionary } from "@/lib/i18n";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export default function OnboardingPhotoStep({
  dict,
  lang,
  baseHref,
  currentPhotoUrl,
}: {
  dict: Dictionary;
  lang: string;
  baseHref: string;
  dashboardHref: string;
  currentPhotoUrl: string;
}) {
  const router = useRouter();
  const [previewUrl, setPreviewUrl] = useState(currentPhotoUrl);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validateFile(nextFile: File | null): string | null {
    if (!nextFile) return null;
    if (!ALLOWED_TYPES.includes(nextFile.type)) {
      return t(dict, "dashboard.onboarding.photoStep.invalidType");
    }
    if (nextFile.size > MAX_SIZE_BYTES) {
      return t(dict, "dashboard.onboarding.photoStep.tooLarge");
    }
    return null;
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setUploaded(false);
    setFile(nextFile);
    setError(validateFile(nextFile));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploaded(false);

    if (!file) {
      router.push(reviewHref);
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    setError(null);

    try {
      const res = await fetch("/api/specialist/avatar/upload", {
        method: "POST",
        body: formData,
      });
      const json = (await res.json().catch(() => ({}))) as { url?: unknown; error?: unknown };

      if (!res.ok || typeof json.url !== "string") {
        setError(
          typeof json.error === "string"
            ? json.error
            : t(dict, "dashboard.onboarding.photoStep.uploadFailed"),
        );
        return;
      }

      const uploadedUrl = json.url.trim();
      setPreviewUrl(uploadedUrl);
      setFile(null);
      setUploaded(true);
      router.refresh();
    } catch {
      setError(t(dict, "dashboard.onboarding.photoStep.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  const secondaryLinkClass =
    "inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50";
  const reviewHref = `/${lang}/specialist/dashboard/onboarding?step=review`;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          {t(dict, "dashboard.onboarding.photoStep.title")}
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          {t(dict, "dashboard.onboarding.photoStep.helper")}
        </p>
      </div>

      <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">
            {t(dict, "dashboard.onboarding.photoStep.currentPhoto")}
          </p>
          <div className="flex items-center gap-4">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={t(dict, "dashboard.onboarding.photoStep.currentPhoto")}
                className="h-28 w-28 shrink-0 rounded-full border border-gray-200 object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 text-xs text-gray-500">
                {t(dict, "dashboard.onboarding.steps.photo")}
              </div>
            )}
            <p className="max-w-xs text-xs leading-relaxed text-gray-500">
              {t(dict, "dashboard.onboarding.photoStep.previewHint")}
            </p>
          </div>
        </div>

        <label className="block space-y-2 text-sm">
          <span className="font-medium text-gray-700">
            {t(dict, "dashboard.onboarding.photoStep.chooseFile")}
          </span>
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
            disabled={uploading}
          />
          <span className="block text-xs text-gray-500">
            {t(dict, "dashboard.onboarding.photoStep.fileHint")}
          </span>
        </label>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {uploaded ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            {t(dict, "dashboard.onboarding.photoStep.uploaded")}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Link href={`${baseHref}?step=services`} className={secondaryLinkClass}>
            {t(dict, "dashboard.onboarding.nav.back")}
          </Link>
          <button
            type="submit"
            disabled={uploading}
            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
          >
            {uploading
              ? t(dict, "dashboard.onboarding.photoStep.uploading")
              : file
                ? t(dict, "dashboard.onboarding.photoStep.uploadAndContinue")
                : t(dict, "dashboard.onboarding.photoStep.next")}
          </button>
        </div>
      </form>
    </section>
  );
}
