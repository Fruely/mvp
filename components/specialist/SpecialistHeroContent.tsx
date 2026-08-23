import type { ReactNode } from "react";
import Image from "next/image";
import { Briefcase, Globe, MapPin } from "lucide-react";
import FounderBadge from "@/components/specialist/FounderBadge";
import CofounderBadge from "@/components/specialist/CofounderBadge";

export type SpecialistHeroContentProps = {
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
  showCofounderBadge?: boolean;
  cofounderBadgeLabel?: string;
  successMessage?: string | null;
  aboutPreview?: string | null;
  actions?: ReactNode;
};

function MetaItem({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-freuly-text-primary sm:gap-2 sm:text-sm">
      {icon}
      {label}
    </span>
  );
}

export default function SpecialistHeroContent({
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
  showCofounderBadge,
  cofounderBadgeLabel,
  successMessage,
  aboutPreview,
  actions,
}: SpecialistHeroContentProps) {
  const trimmed = typeof avatarUrl === "string" ? avatarUrl.trim() : "";

  return (
    <div className="flex w-full flex-col gap-5 md:flex-row md:items-center md:gap-12">
      <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-2xl bg-freuly-primary-light md:h-[380px] md:w-[380px] md:rounded-[24px]">
        {trimmed ? (
          <Image
            src={trimmed}
            alt={avatarAlt}
            fill
            className="object-cover object-[50%_20%]"
            sizes="(max-width: 768px) 100vw, 380px"
            unoptimized
            priority
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-freuly-primary-light">
            <span className="text-5xl text-freuly-primary" aria-hidden>
              👤
            </span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4 md:gap-5">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {showFounderBadge ? <FounderBadge /> : null}
          {isNew ? (
            <span className="inline-flex items-center rounded-full border border-freuly-primary/20 bg-freuly-primary-light px-2.5 py-1 text-[11px] font-semibold text-freuly-primary">
              {newBadgeLabel}
            </span>
          ) : null}
          {specialization ? (
            <p className="text-[13px] font-semibold text-freuly-text-secondary sm:text-sm">
              {specialization}
            </p>
          ) : null}
        </div>

        <h1 className="text-[28px] font-extrabold leading-tight text-freuly-text-primary md:text-[40px]">
          {name}
        </h1>

        {showCofounderBadge && cofounderBadgeLabel ? (
          <CofounderBadge label={cofounderBadgeLabel} />
        ) : null}

        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 sm:gap-x-6">
          {city ? (
            <MetaItem
              icon={<MapPin className="h-3.5 w-3.5 text-freuly-primary sm:h-4 sm:w-4" aria-hidden />}
              label={city}
            />
          ) : null}
          {workModeText ? (
            <MetaItem
              icon={<Briefcase className="h-3.5 w-3.5 text-freuly-primary sm:h-4 sm:w-4" aria-hidden />}
              label={workModeText}
            />
          ) : null}
          {languages.length > 0 ? (
            <MetaItem
              icon={<Globe className="h-3.5 w-3.5 text-freuly-primary sm:h-4 sm:w-4" aria-hidden />}
              label={languages.slice(0, 3).join(" • ")}
            />
          ) : null}
        </div>

        {aboutPreview ? (
          <p className="line-clamp-3 text-sm leading-[1.5] text-freuly-text-secondary md:line-clamp-2 md:text-base md:leading-[1.6]">
            {aboutPreview}
          </p>
        ) : null}

        {successMessage ? (
          <div className="rounded-freuly-md border border-freuly-success-border bg-freuly-success-light px-3 py-2 text-sm font-medium text-freuly-success">
            {successMessage}
          </div>
        ) : null}

        {actions}
      </div>
    </div>
  );
}
