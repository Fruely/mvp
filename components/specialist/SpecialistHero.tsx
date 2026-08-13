"use client";

import type { ReactNode } from "react";
import SpecialistHeroContent from "@/components/specialist/SpecialistHeroContent";

export default function SpecialistHero({
  avatarUrl,
  avatarAlt,
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
  avatarUrl?: string | null;
  avatarAlt: string;
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
    <aside className="rounded-xl border border-black/5 bg-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.05)] sm:p-6">
      <div className="space-y-4">
        <SpecialistHeroContent
          avatarUrl={avatarUrl}
          avatarAlt={avatarAlt}
          name={name}
          specialization={specialization}
          city={city}
          languages={languages}
          workModeText={workModeText}
          isNew={isNew}
          newBadgeLabel={newBadgeLabel}
          showFounderBadge={showFounderBadge}
          successMessage={successMessage}
          aboutPreview={aboutPreview}
          aboutHref={aboutHref}
          readMoreLabel={readMoreLabel}
        />

        {showForm ? (
          <div id="lead-form" className="rounded-xl border border-black/5 bg-white p-3 sm:p-4">
            <h2 className="mb-4 text-lg font-semibold text-freuly-text-primary">{formTitle}</h2>
            {formNode}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
