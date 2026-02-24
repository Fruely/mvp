"use client";

import type { ReactNode } from "react";

export default function SpecialistHero({
  name,
  specialization,
  city,
  languages,
  workModeText,
  isNew,
  newBadgeLabel,
  onSendRequest,
  sendRequestLabel,
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
  onSendRequest: () => void;
  sendRequestLabel: string;
  aboutPreview?: string | null;
  aboutHref: string;
  readMoreLabel: string;
  showForm: boolean;
  formTitle: string;
  formNode: ReactNode;
}) {
  return (
    <aside className="rounded-2xl border border-black/5 bg-white p-4 shadow-md sm:p-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold leading-tight text-gray-900">{name}</h1>
            {isNew ? (
              <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white">{newBadgeLabel}</span>
            ) : null}
          </div>
          {specialization ? <p className="text-sm font-medium text-slate-600">{specialization}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
          {city ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
              <span aria-hidden>📍</span>
              {city}
            </span>
          ) : null}
          {workModeText ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
              <span aria-hidden>💻</span>
              {workModeText}
            </span>
          ) : null}
          {languages.length > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
              <span aria-hidden>🌐</span>
              {languages.slice(0, 3).join(" • ")}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onSendRequest}
          className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg"
        >
          <span aria-hidden>⚡</span>
          {sendRequestLabel}
        </button>

        {aboutPreview ? (
          <div className="rounded-xl bg-slate-50 p-3 sm:p-4">
            <p className="line-clamp-4 text-sm leading-relaxed text-gray-700">{aboutPreview}</p>
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
