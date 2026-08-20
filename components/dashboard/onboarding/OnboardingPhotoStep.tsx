"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import SpecialistAvatarImage from "@/components/specialist/SpecialistAvatarImage";
import HomepagePhotoCropEditor from "@/components/specialist/HomepagePhotoCropEditor";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { dashboardLinkSecondaryClass, dashboardUploadButtonClass } from "@/components/dashboard/dashboardStyles";
import { t, type Dictionary } from "@/lib/i18n";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export type OnboardingHomepagePhoto = {
  photo_source_url: string | null;
  homepage_photo_url: string | null;
  homepage_photo: unknown;
};

export default function OnboardingPhotoStep({
  dict,
  lang,
  baseHref,
  currentPhotoUrl,
  specialistId,
  homepagePhoto,
  previewName,
  previewCategory,
}: {
  dict: Dictionary;
  lang: string;
  baseHref: string;
  dashboardHref: string;
  currentPhotoUrl: string;
  specialistId: string;
  homepagePhoto: OnboardingHomepagePhoto;
  previewName?: string;
  previewCategory?: string;
}) {
  const router = useRouter();
  const mainPhotoFormId = useId();
  const reviewHref = `/${lang}/specialist/dashboard/onboarding?step=review`;
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
      const json = (await res.json().catch(() => ({}))) as {
        url?: unknown;
        avatar_url?: unknown;
        error?: unknown;
      };

      const uploadedUrl =
        typeof json.avatar_url === "string"
          ? json.avatar_url.trim()
          : typeof json.url === "string"
            ? json.url.trim()
            : "";

      if (!res.ok || !uploadedUrl) {
        setError(
          typeof json.error === "string"
            ? json.error
            : t(dict, "dashboard.onboarding.photoStep.uploadFailed"),
        );
        return;
      }

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

  return (
    <Card padding="lg" className="min-w-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-freuly-card-title">
          {t(dict, "dashboard.onboarding.photoStep.title")}
        </CardTitle>
        <p className="mt-freuly-2 max-w-3xl text-freuly-body-sm text-freuly-text-secondary">
          {t(dict, "dashboard.onboarding.photoStep.helper")}
        </p>
      </CardHeader>

      <CardContent className="min-w-0">
        <form id={mainPhotoFormId} className="space-y-freuly-5" onSubmit={handleSubmit}>
          <div className="space-y-freuly-3">
            <p className="text-freuly-body-sm font-medium text-freuly-text-primary">
              {t(dict, "dashboard.onboarding.photoStep.currentPhoto")}
            </p>
            <div className="flex flex-col gap-freuly-4 sm:flex-row sm:items-start">
              <div className="w-full max-w-xs shrink-0">
                <SpecialistAvatarImage
                  src={previewUrl}
                  alt={t(dict, "dashboard.onboarding.photoStep.currentPhoto")}
                  loading={uploading}
                />
              </div>
              <p className="max-w-xs text-freuly-helper leading-relaxed text-freuly-text-muted">
                {t(dict, "dashboard.onboarding.photoStep.previewHint")}
              </p>
            </div>
          </div>

          <label className="block space-y-freuly-2 text-freuly-body-sm">
            <span className="font-medium text-freuly-text-primary">
              {t(dict, "dashboard.onboarding.photoStep.chooseFile")}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileChange}
              className={`block w-full text-freuly-body-sm text-freuly-text-secondary file:mr-freuly-4 file:rounded-freuly-md file:border-0 file:bg-freuly-primary-light file:px-freuly-4 file:py-freuly-2 file:text-freuly-body-sm file:font-semibold file:text-freuly-primary hover:file:bg-freuly-primary-light/80 ${dashboardUploadButtonClass}`}
              disabled={uploading}
            />
            <span className="block text-freuly-helper text-freuly-text-muted">
              {t(dict, "dashboard.onboarding.photoStep.fileHint")}
            </span>
          </label>

          {error ? <Alert variant="error">{error}</Alert> : null}

          {uploaded ? <Alert variant="success">{t(dict, "dashboard.onboarding.photoStep.uploaded")}</Alert> : null}
        </form>

        <div className="mt-freuly-8 min-w-0 overflow-x-hidden border-t border-freuly-border-subtle pt-freuly-6">
          <p className="mb-freuly-4 text-freuly-helper text-freuly-text-muted">
            {t(dict, "dashboard.onboarding.homepagePhoto.optionalHint")}
          </p>
          <HomepagePhotoCropEditor
            dict={dict}
            specialistId={specialistId}
            initialSourceUrl={homepagePhoto.photo_source_url}
            initialHomepagePhotoUrl={homepagePhoto.homepage_photo_url}
            initialMetadata={homepagePhoto.homepage_photo}
            canonicalOrigin={process.env.NEXT_PUBLIC_SUPABASE_URL ?? null}
            previewName={previewName}
            previewCategory={previewCategory}
          />
        </div>

        <div className="mt-freuly-6 flex flex-wrap items-center gap-freuly-3">
          <Link href={`${baseHref}?step=services`} className={dashboardLinkSecondaryClass}>
            {t(dict, "dashboard.onboarding.nav.back")}
          </Link>
          <Button type="submit" form={mainPhotoFormId} disabled={uploading} className="w-full sm:w-auto">
            {uploading
              ? t(dict, "dashboard.onboarding.photoStep.uploading")
              : file
                ? t(dict, "dashboard.onboarding.photoStep.uploadAndContinue")
                : t(dict, "dashboard.onboarding.photoStep.next")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
