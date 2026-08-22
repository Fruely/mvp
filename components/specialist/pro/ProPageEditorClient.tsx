"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Button, Input, Textarea } from "@/components/ui";
import { dashboardLinkPrimaryClass, dashboardLinkSecondaryClass } from "@/components/dashboard/dashboardStyles";
import type { ProPageEditorBundle, ProPageSectionItem } from "@/lib/specialists/proPage/types";
import { getSpecialistUrl } from "@/lib/publicUrls";
import { t, type Dictionary } from "@/lib/i18n";

type Props = {
  dict: Dictionary;
  lang: string;
  specialistId: string;
  publicSlug: string;
  initialBundle: ProPageEditorBundle;
};

type DraftFormState = ProPageEditorBundle["draft"];

function emptySectionItem(): ProPageSectionItem {
  return { title: "", description: "" };
}

function SectionListEditor({
  dict,
  label,
  sectionKey,
  items,
  onChange,
  minHint,
}: {
  dict: Dictionary;
  label: string;
  sectionKey: string;
  items: ProPageSectionItem[];
  onChange: (items: ProPageSectionItem[]) => void;
  minHint?: string;
}) {
  const updateItem = (index: number, patch: Partial<ProPageSectionItem>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  return (
    <div className="space-y-freuly-4 rounded-freuly-lg border border-freuly-border-default bg-freuly-surface p-freuly-4">
      <div>
        <h3 className="text-freuly-card-title text-freuly-text-primary">{label}</h3>
        {minHint ? <p className="mt-1 text-freuly-body-sm text-freuly-text-secondary">{minHint}</p> : null}
      </div>
      <div className="space-y-freuly-4">
        {items.map((item, index) => (
          <div
            key={`section-item-${index}`}
            className="space-y-freuly-3 rounded-freuly-md border border-freuly-border-subtle p-freuly-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-freuly-body-sm font-medium text-freuly-text-secondary">
                {t(dict, "dashboard.proPageEditor.sectionItemLabel").replace("{{index}}", String(index + 1))}
              </span>
              <Button
                type="button"
                variant="ghost"
                className="min-h-0 px-2 py-1 text-sm"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                disabled={items.length <= 1}
              >
                {t(dict, "dashboard.proPageEditor.removeItem")}
              </Button>
            </div>
            <Input
              id={`pro-page-${sectionKey}-${index}-title`}
              label={t(dict, "dashboard.proPageEditor.fieldTitle")}
              value={item.title}
              onChange={(e) => updateItem(index, { title: e.target.value })}
            />
            <Textarea
              id={`pro-page-${sectionKey}-${index}-description`}
              label={t(dict, "dashboard.proPageEditor.fieldDescription")}
              value={item.description}
              onChange={(e) => updateItem(index, { description: e.target.value })}
              rows={3}
            />
          </div>
        ))}
      </div>
      <Button type="button" variant="outlinePrimary" onClick={() => onChange([...items, emptySectionItem()])}>
        {t(dict, "dashboard.proPageEditor.addItem")}
      </Button>
    </div>
  );
}

function EditorialImagePreview({
  dict,
  label,
  url,
}: {
  dict: Dictionary;
  label: string;
  url: string | null;
}) {
  return (
    <div className="space-y-freuly-2">
      <p className="text-freuly-body-sm font-medium text-freuly-text-primary">{label}</p>
      {url ? (
        <div className="relative h-40 w-full max-w-md overflow-hidden rounded-freuly-md border border-freuly-border-default">
          <Image src={url} alt="" fill className="object-cover object-center" sizes="400px" />
        </div>
      ) : (
        <p className="text-freuly-body-sm text-freuly-text-secondary">
          {t(dict, "dashboard.proPageEditor.imageLaterNote")}
        </p>
      )}
    </div>
  );
}

export default function ProPageEditorClient({
  dict,
  lang,
  specialistId,
  publicSlug,
  initialBundle,
}: Props) {
  const [form, setForm] = useState<DraftFormState>(initialBundle.draft);
  const [hasPublishedPage, setHasPublishedPage] = useState(initialBundle.hasPublishedPage);
  const [publicPath, setPublicPath] = useState(initialBundle.publicPath);
  const [saveLoading, setSaveLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const buildPayload = useCallback(
    () => ({
      display_name: form.displayName,
      profession_label: form.professionLabel,
      positioning: form.positioning,
      story: form.story,
      client_language: form.clientLanguage,
      client_requests: form.clientRequests,
      work_process: form.workProcess,
      why_me: form.whyMe,
      why_me_image_url: form.whyMeImageUrl,
      final_cta_image_url: form.finalCtaImageUrl,
    }),
    [form],
  );

  async function handleSaveDraft() {
    setSaveLoading(true);
    setError(null);
    setSuccess(null);
    setValidationErrors([]);
    try {
      const response = await fetch("/api/specialist/pro-page/draft", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const result = (await response.json()) as {
        error?: string;
        draft?: DraftFormState;
      };
      if (!response.ok) {
        setError(t(dict, `dashboard.proPageEditor.errors.${result.error ?? "saveFailed"}`));
        return;
      }
      if (result.draft) {
        setForm(result.draft);
      }
      setSuccess(t(dict, "dashboard.proPageEditor.saveSuccess"));
    } catch {
      setError(t(dict, "dashboard.proPageEditor.errors.saveFailed"));
    } finally {
      setSaveLoading(false);
    }
  }

  async function handlePublish() {
    setPublishLoading(true);
    setError(null);
    setSuccess(null);
    setValidationErrors([]);
    try {
      const saveResponse = await fetch("/api/specialist/pro-page/draft", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!saveResponse.ok) {
        const saveResult = (await saveResponse.json()) as { error?: string };
        setError(t(dict, `dashboard.proPageEditor.errors.${saveResult.error ?? "saveFailed"}`));
        return;
      }
      const saveBody = (await saveResponse.json()) as { draft?: DraftFormState };
      if (saveBody.draft) {
        setForm(saveBody.draft);
      }

      const response = await fetch("/api/specialist/pro-page/publish", { method: "POST" });
      const result = (await response.json()) as {
        error?: string;
        validationErrors?: string[];
        draft?: DraftFormState;
      };
      if (!response.ok) {
        if (result.validationErrors?.length) {
          setValidationErrors(result.validationErrors);
        }
        setError(t(dict, `dashboard.proPageEditor.errors.${result.error ?? "publishFailed"}`));
        return;
      }
      if (result.draft) {
        setForm(result.draft);
      }
      setHasPublishedPage(true);
      setPublicPath(
        getSpecialistUrl(lang as "ru" | "ua" | "de", { id: specialistId, slug: publicSlug }),
      );
      setSuccess(t(dict, "dashboard.proPageEditor.publishSuccess"));
    } catch {
      setError(t(dict, "dashboard.proPageEditor.errors.publishFailed"));
    } finally {
      setPublishLoading(false);
    }
  }

  const validationErrorLabels = validationErrors.map((key) =>
    t(dict, `dashboard.proPageEditor.validation.${key}`, { defaultValue: key }),
  );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-freuly-8 pb-freuly-10">
      <header className="space-y-freuly-2">
        <h1 className="text-freuly-page-title text-freuly-text-primary">
          {t(dict, "dashboard.proPageEditor.title")}
        </h1>
        <p className="text-freuly-page-subtitle text-freuly-text-secondary">
          {t(dict, "dashboard.proPageEditor.subtitle")}
        </p>
      </header>

      {error ? (
        <div className="rounded-freuly-md border border-freuly-error-border bg-freuly-error-light px-freuly-4 py-freuly-3 text-freuly-body-sm text-freuly-error">
          {error}
        </div>
      ) : null}
      {validationErrorLabels.length > 0 ? (
        <ul className="list-disc space-y-1 rounded-freuly-md border border-freuly-warning-border bg-freuly-warning-light px-freuly-5 py-freuly-3 text-freuly-body-sm text-freuly-text-primary">
          {validationErrorLabels.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      ) : null}
      {success ? (
        <div className="rounded-freuly-md border border-freuly-success-border bg-freuly-success-light px-freuly-4 py-freuly-3 text-freuly-body-sm text-freuly-text-primary">
          {success}
        </div>
      ) : null}

      <section className="space-y-freuly-4">
        <h2 className="text-freuly-card-title text-freuly-text-primary">
          {t(dict, "dashboard.proPageEditor.sections.identity")}
        </h2>
        <Input
          id="pro-page-display-name"
          label={t(dict, "dashboard.proPageEditor.fields.displayName")}
          helperText={t(dict, "dashboard.proPageEditor.fields.displayNameHint")}
          value={form.displayName ?? ""}
          onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value || null }))}
        />
        <Input
          id="pro-page-profession-label"
          label={t(dict, "dashboard.proPageEditor.fields.professionLabel")}
          value={form.professionLabel ?? ""}
          onChange={(e) => setForm((prev) => ({ ...prev, professionLabel: e.target.value || null }))}
        />
        <Textarea
          id="pro-page-positioning"
          label={t(dict, "dashboard.proPageEditor.fields.positioning")}
          value={form.positioning ?? ""}
          onChange={(e) => setForm((prev) => ({ ...prev, positioning: e.target.value || null }))}
          rows={4}
        />
        <Input
          id="pro-page-client-language"
          label={t(dict, "dashboard.proPageEditor.fields.clientLanguage")}
          helperText={t(dict, "dashboard.proPageEditor.fields.clientLanguageHint")}
          value={form.clientLanguage ?? ""}
          onChange={(e) => setForm((prev) => ({ ...prev, clientLanguage: e.target.value || null }))}
        />
      </section>

      <SectionListEditor
        dict={dict}
        sectionKey="client-requests"
        label={t(dict, "dashboard.proPageEditor.sections.clientRequests")}
        minHint={t(dict, "dashboard.proPageEditor.minClientRequests")}
        items={form.clientRequests.length > 0 ? form.clientRequests : [emptySectionItem()]}
        onChange={(clientRequests) => setForm((prev) => ({ ...prev, clientRequests }))}
      />

      <SectionListEditor
        dict={dict}
        sectionKey="work-process"
        label={t(dict, "dashboard.proPageEditor.sections.workProcess")}
        minHint={t(dict, "dashboard.proPageEditor.minWorkProcess")}
        items={form.workProcess.length > 0 ? form.workProcess : [emptySectionItem()]}
        onChange={(workProcess) => setForm((prev) => ({ ...prev, workProcess }))}
      />

      <SectionListEditor
        dict={dict}
        sectionKey="why-me"
        label={t(dict, "dashboard.proPageEditor.sections.whyMe")}
        minHint={t(dict, "dashboard.proPageEditor.minWhyMe")}
        items={form.whyMe.length > 0 ? form.whyMe : [emptySectionItem()]}
        onChange={(whyMe) => setForm((prev) => ({ ...prev, whyMe }))}
      />

      <section className="space-y-freuly-4">
        <h2 className="text-freuly-card-title text-freuly-text-primary">
          {t(dict, "dashboard.proPageEditor.sections.story")}
        </h2>
        <Textarea
          id="pro-page-story"
          label={t(dict, "dashboard.proPageEditor.fields.story")}
          value={form.story ?? ""}
          onChange={(e) => setForm((prev) => ({ ...prev, story: e.target.value || null }))}
          rows={6}
        />
      </section>

      <section className="space-y-freuly-4 rounded-freuly-lg border border-freuly-border-default bg-freuly-surface p-freuly-4">
        <h2 className="text-freuly-card-title text-freuly-text-primary">
          {t(dict, "dashboard.proPageEditor.sections.editorialImages")}
        </h2>
        <EditorialImagePreview
          dict={dict}
          label={t(dict, "dashboard.proPageEditor.fields.whyMeImage")}
          url={form.whyMeImageUrl}
        />
        <EditorialImagePreview
          dict={dict}
          label={t(dict, "dashboard.proPageEditor.fields.finalCtaImage")}
          url={form.finalCtaImageUrl}
        />
      </section>

      <div className="flex flex-col gap-freuly-3 sm:flex-row sm:flex-wrap">
        <Button type="button" variant="secondary" onClick={handleSaveDraft} disabled={saveLoading || publishLoading}>
          {saveLoading ? t(dict, "dashboard.proPageEditor.saving") : t(dict, "dashboard.proPageEditor.saveDraft")}
        </Button>
        <Button type="button" variant="primary" onClick={handlePublish} disabled={saveLoading || publishLoading}>
          {publishLoading ? t(dict, "dashboard.proPageEditor.publishing") : t(dict, "dashboard.proPageEditor.publish")}
        </Button>
        {hasPublishedPage && publicPath ? (
          <Link href={publicPath} className={dashboardLinkSecondaryClass} target="_blank" rel="noopener noreferrer">
            {t(dict, "dashboard.proPageEditor.openPublic")}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
