"use client";

import type { ReactNode } from "react";
import { Globe, Laptop, MapPin } from "lucide-react";
import FounderBadge from "@/components/specialist/FounderBadge";

export default function SpecialistHero({
  name,
  specialization,
  city,
  languages,
  workModeText,
  isNew,
  newBadgeLabel,
  showFounderBadge,
  successMessage,
  aboutPreview,
  aboutHref,
  readMoreLabel,
  showForm,
  formTitle,
  formNode,
}: {
  name: string;
  specialization: string | null;
  city?: string | null;
  languages: string[];
  workModeText?: string | null;
  isNew: boolean;
  newBadgeLabel: string;
  showFounderBadge?: boolean;
  successMessage?: string | null;
  aboutPreview?: string | null;
  aboutHref: string;
  readMoreLabel: string;
  showForm: boolean;
  formTitle: string;
  formNode: ReactNode;
}) {
  return (
    <aside className="rounded-xl border border-black/5 bg-white p-4 shadow-card sm:p-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-textPrimary">{name}</h1>
            {showFounderBadge ? <FounderBadge /> : null}
            {isNew ? (
              <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white">{newBadgeLabel}</span>
            ) : null}
          </div>
          {specialization ? <p className="text-sm font-medium text-textSecondary">{specialization}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm font-normal text-textSecondary">
          {city ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
              <MapPin className="h-4 w-4 text-gray-500" aria-hidden />
              {city}
            </span>
          ) : null}
          {workModeText ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
              <Laptop className="h-4 w-4 text-gray-500" aria-hidden />
              {workModeText}
            </span>
          ) : null}
          {languages.length > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
              <Globe className="h-4 w-4 text-gray-500" aria-hidden />
              {languages.slice(0, 3).join(" • ")}
            </span>
          ) : null}
        </div>

        {successMessage ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
            {successMessage}
          </div>
        ) : null}

        {aboutPreview ? (
          <div className="rounded-xl bg-slate-50 p-3 sm:p-4">
            <p className="line-clamp-4 text-sm font-normal leading-relaxed text-textSecondary">{aboutPreview}</p>
            <a href={aboutHref} className="mt-2 inline-flex text-sm font-medium text-blue-600 transition hover:text-blue-700">
              {readMoreLabel}
            </a>
          </div>
        ) : null}

        {showForm ? (
          <div id="lead-form" className="rounded-xl border border-black/5 bg-white p-3 sm:p-4">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">{formTitle}</h2>
            {formNode}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
