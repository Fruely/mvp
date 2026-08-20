"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { t, type Dictionary } from "@/lib/i18n";
import { Button } from "@/components/ui";
import { dashboardHelperClass, dashboardUploadButtonClass } from "@/components/dashboard/dashboardStyles";
import { HomepagePhotoCardPreview } from "@/components/specialist/HomepagePhotoCardPreview";
import {
  generateHomepagePhotoFromEditor,
  homepagePhotoErrorMessageKey,
  uploadNewHomepageSource,
  type HomepagePhotoClientDeps,
} from "@/lib/specialistMedia/homepagePhotoClient";
import {
  HOMEPAGE_PHOTO_CROP_ASPECT,
  HOMEPAGE_PHOTO_EDITOR_MAX_ZOOM,
  HOMEPAGE_PHOTO_EDITOR_MIN_ZOOM,
  applyCropComplete,
  applyEditorError,
  applyGenerateSuccess,
  applyPan,
  applyWorkingSource,
  applyZoom,
  canSaveHomepagePhotoEditor,
  createHomepagePhotoEditorState,
  expectedUpdatedAtForSave,
  markDirty,
  resetHomepagePhotoEditor,
  type HomepagePhotoEditorState,
} from "@/lib/specialistMedia/homepagePhotoEditorState";

export type HomepagePhotoCropEditorProps = {
  dict: Dictionary;
  specialistId: string;
  initialSourceUrl?: string | null;
  initialHomepagePhotoUrl?: string | null;
  initialMetadata?: unknown;
  canonicalOrigin?: string | null;
  previewName?: string;
  previewCategory?: string;
  clientDeps?: HomepagePhotoClientDeps;
};

export default function HomepagePhotoCropEditor({
  dict,
  specialistId,
  initialSourceUrl = null,
  initialHomepagePhotoUrl = null,
  initialMetadata = null,
  canonicalOrigin = null,
  previewName,
  previewCategory,
  clientDeps,
}: HomepagePhotoCropEditorProps) {
  const fileInputId = useId();
  const zoomInputId = useId();
  const statusId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialState = useMemo(
    () =>
      createHomepagePhotoEditorState({
        specialistId,
        initialSourceUrl,
        initialHomepagePhotoUrl,
        initialMetadata,
        canonicalOrigin,
      }),
    [specialistId, initialSourceUrl, initialHomepagePhotoUrl, initialMetadata, canonicalOrigin],
  );
  const [state, setState] = useState<HomepagePhotoEditorState>(initialState);

  useEffect(() => {
    setState(initialState);
  }, [initialState]);

  useEffect(() => {
    return () => {
      if (state.workingObjectUrl) URL.revokeObjectURL(state.workingObjectUrl);
    };
  }, [state.workingObjectUrl]);

  const hintKeys = [
    "dashboard.homepagePhoto.hint.person",
    "dashboard.homepagePhoto.hint.face",
    "dashboard.homepagePhoto.hint.headroom",
    "dashboard.homepagePhoto.hint.torso",
    "dashboard.homepagePhoto.hint.edge",
    "dashboard.homepagePhoto.hint.noText",
    "dashboard.homepagePhoto.hint.light",
    "dashboard.homepagePhoto.hint.quality",
  ] as const;

  const setError = useCallback((error: string) => {
    setState((prev) => applyEditorError(prev, error));
  }, []);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setState((prev) => ({ ...prev, status: "uploading", error: null }));
    const uploaded = await uploadNewHomepageSource(file, clientDeps);
    if (!uploaded.ok) {
      setError(uploaded.error);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setState((prev) => {
      if (prev.workingObjectUrl) URL.revokeObjectURL(prev.workingObjectUrl);
      return applyWorkingSource(prev, { objectUrl, sourceIdentity: uploaded.source_identity });
    });
  }

  function handleReset() {
    setState((prev) => {
      if (prev.workingObjectUrl) URL.revokeObjectURL(prev.workingObjectUrl);
      return resetHomepagePhotoEditor(prev, initialState);
    });
  }

  async function handleSave() {
    if (!canSaveHomepagePhotoEditor(state) || !state.workingSourceIdentity || !state.croppedAreaPixels) {
      return;
    }
    setState((prev) => ({ ...prev, status: "saving", error: null }));
    const result = await generateHomepagePhotoFromEditor(
      {
        source_identity: state.workingSourceIdentity,
        crop: state.croppedAreaPixels,
        zoom: state.zoom,
        expectedUpdatedAt: expectedUpdatedAtForSave(state),
      },
      clientDeps,
    );
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setState((prev) => {
      if (prev.workingObjectUrl) URL.revokeObjectURL(prev.workingObjectUrl);
      return applyGenerateSuccess(prev, result.body);
    });
  }

  const canSave = canSaveHomepagePhotoEditor(state);
  const busy = state.status === "uploading" || state.status === "saving";
  const liveMessage = state.error
    ? t(dict, homepagePhotoErrorMessageKey(state.error))
    : state.status === "success"
      ? t(dict, "dashboard.homepagePhoto.saved")
      : state.status === "uploading"
        ? t(dict, "dashboard.homepagePhoto.uploading")
        : state.status === "saving"
          ? t(dict, "dashboard.homepagePhoto.saving")
          : "";

  return (
    <section className="space-y-4" aria-labelledby="homepage-photo-editor-title">
      <div className="space-y-1">
        <h2 id="homepage-photo-editor-title" className="text-sm font-medium text-freuly-text-primary">
          {t(dict, "dashboard.homepagePhoto.title")}
        </h2>
        <p className={dashboardHelperClass}>{t(dict, "dashboard.homepagePhoto.subtitle")}</p>
        <p className="text-sm text-freuly-text-primary">{t(dict, "dashboard.homepagePhoto.recommendedSize")}</p>
        <p className={dashboardHelperClass}>{t(dict, "dashboard.homepagePhoto.recommendedExplain")}</p>
        <ul className={`${dashboardHelperClass} list-disc space-y-0.5 pl-5`}>
          {hintKeys.map((key) => (
            <li key={key}>{t(dict, key)}</li>
          ))}
        </ul>
        <p className={dashboardHelperClass}>{t(dict, "dashboard.homepagePhoto.fileHint")}</p>
      </div>

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-freuly-text-muted">
            {t(dict, "dashboard.homepagePhoto.workingLabel")}
          </p>
          <div className="relative aspect-[31/20] w-full max-w-[620px] overflow-hidden rounded-freuly-md bg-freuly-border-subtle">
            {state.workingImageUrl ? (
              <Cropper
                key={state.sourceEpoch}
                image={state.workingImageUrl}
                crop={state.crop}
                zoom={state.zoom}
                rotation={0}
                minZoom={HOMEPAGE_PHOTO_EDITOR_MIN_ZOOM}
                maxZoom={HOMEPAGE_PHOTO_EDITOR_MAX_ZOOM}
                aspect={HOMEPAGE_PHOTO_CROP_ASPECT}
                objectFit="contain"
                zoomWithScroll
                showGrid={false}
                restrictPosition
                keyboardStep={1}
                style={{}}
                classes={{ containerClassName: "homepage-photo-crop-frame" }}
                mediaProps={{ alt: t(dict, "dashboard.homepagePhoto.workingLabel") }}
                cropperProps={{}}
                initialCroppedAreaPixels={state.initialCroppedAreaPixels ?? undefined}
                onCropChange={(crop) => setState((prev) => applyPan(prev, crop))}
                onZoomChange={(zoom) => setState((prev) => applyZoom(prev, zoom))}
                onCropComplete={(_area: Area, pixels: Area) =>
                  setState((prev) => applyCropComplete(prev, pixels))
                }
                onInteractionStart={() => setState((prev) => markDirty(prev))}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm text-freuly-text-muted">
                {t(dict, "dashboard.homepagePhoto.emptyEditor")}
              </div>
            )}
          </div>

          <div className="flex max-w-[620px] flex-col gap-3">
            <div className="space-y-1">
              <label htmlFor={zoomInputId} className="text-sm font-medium text-freuly-text-primary">
                {t(dict, "dashboard.homepagePhoto.zoom")}
              </label>
              <input
                id={zoomInputId}
                type="range"
                min={HOMEPAGE_PHOTO_EDITOR_MIN_ZOOM}
                max={HOMEPAGE_PHOTO_EDITOR_MAX_ZOOM}
                step={0.05}
                value={state.zoom}
                disabled={!state.workingImageUrl || busy}
                onChange={(event) => setState((prev) => applyZoom(prev, Number(event.target.value)))}
                className="h-10 w-full accent-freuly-primary"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <label htmlFor={fileInputId} className={`${dashboardUploadButtonClass} min-h-11 justify-center`}>
                {state.workingImageUrl
                  ? t(dict, "dashboard.homepagePhoto.replace")
                  : t(dict, "dashboard.homepagePhoto.chooseFile")}
                <input
                  ref={fileInputRef}
                  id={fileInputId}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="sr-only"
                  disabled={busy}
                  onChange={handleFileChange}
                />
              </label>
              <Button type="button" variant="secondary" className="min-h-11" disabled={busy || !state.dirty} onClick={handleReset}>
                {t(dict, "dashboard.homepagePhoto.reset")}
              </Button>
              <Button type="button" className="min-h-11" disabled={!canSave || busy} onClick={() => void handleSave()}>
                {state.status === "saving"
                  ? t(dict, "dashboard.homepagePhoto.saving")
                  : t(dict, "dashboard.homepagePhoto.save")}
              </Button>
            </div>
          </div>
        </div>

        <HomepagePhotoCardPreview
          imageUrl={state.saved?.homepage_photo_url ?? null}
          name={previewName?.trim() || t(dict, "dashboard.homepagePhoto.previewName")}
          category={previewCategory?.trim() || t(dict, "dashboard.homepagePhoto.previewCategory")}
          emptyLabel={t(dict, "dashboard.homepagePhoto.emptyPreview")}
          currentLabel={t(dict, "dashboard.homepagePhoto.currentLabel")}
        />
      </div>

      <div id={statusId} aria-live="polite" className="min-h-[1.25rem] text-sm">
        {state.error ? (
          <p className="font-medium text-freuly-error">{liveMessage}</p>
        ) : state.status === "success" ? (
          <p className="font-medium text-freuly-success">{liveMessage}</p>
        ) : liveMessage ? (
          <p className="text-freuly-text-secondary">{liveMessage}</p>
        ) : null}
      </div>
    </section>
  );
}
