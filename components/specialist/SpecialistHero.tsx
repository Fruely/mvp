"use client";

import SpecialistHeroContent from "@/components/specialist/SpecialistHeroContent";
import Button from "@/components/ui/Button";

export default function SpecialistHero({
  avatarUrl,
  storedPhotoFocus = null,
  specialistId = null,
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
  requestLabel,
  servicesLabel,
  onRequestClick,
  onServicesClick,
  showServicesCta,
}: {
  avatarUrl?: string | null;
  storedPhotoFocus?: unknown;
  specialistId?: string | null;
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
  requestLabel: string;
  servicesLabel: string;
  onRequestClick: () => void;
  onServicesClick: () => void;
  showServicesCta: boolean;
}) {
  return (
    <section className="border-b border-freuly-border-default bg-freuly-surface">
      <div className="mx-auto w-full max-w-[1280px] px-5 py-5 md:px-20 md:py-14">
        <SpecialistHeroContent
          avatarUrl={avatarUrl}
          storedPhotoFocus={storedPhotoFocus}
          specialistId={specialistId}
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
          actions={
            <div className="flex w-full flex-col gap-2.5 md:w-auto md:flex-row md:items-start">
              <Button
                type="button"
                variant="primary"
                onClick={onRequestClick}
                className="h-[42px] w-full rounded-freuly-md px-7 text-[15px] font-semibold md:h-[46px] md:w-auto"
              >
                {requestLabel}
              </Button>
              {showServicesCta ? (
                <button
                  type="button"
                  onClick={onServicesClick}
                  className="inline-flex h-[42px] w-full items-center justify-center rounded-freuly-md border border-freuly-text-primary bg-freuly-surface px-6 text-[15px] font-semibold text-freuly-text-primary transition-colors freuly-focus-ring hover:bg-freuly-page md:h-[46px] md:w-auto"
                >
                  {servicesLabel}
                </button>
              ) : null}
            </div>
          }
        />
      </div>
    </section>
  );
}
