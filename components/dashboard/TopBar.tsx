"use client";

import { Badge, type BadgeVariant } from "@/components/ui";
import { t, type Dictionary } from "@/lib/i18n";
import TopBarLogoutButton from "./TopBarLogoutButton";

type SpecialistTopBarData = {
  name?: string | null;
  first_name?: string | null;
  avatar_url?: string | null;
  subscription_status?: string | null;
};

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "—";
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

function getStatusBadgeVariant(status: string): BadgeVariant {
  if (status === "active" || status === "early_access" || status === "trialing") {
    return "success";
  }
  if (status === "grace" || status === "grace_period") return "warning";
  if (status === "expired") return "error";
  return "neutral";
}

export default function TopBar({
  dict,
  specialist,
  planStatusForBadge,
  onMenuClick,
}: {
  dict: Dictionary;
  specialist: SpecialistTopBarData;
  planStatusForBadge: string;
  onMenuClick: () => void;
}) {
  const name = specialist?.name?.trim() || specialist?.first_name?.trim() || "—";
  const avatarUrl = specialist?.avatar_url?.trim() || "";
  const subscriptionStatus =
    typeof planStatusForBadge === "string" && planStatusForBadge.trim()
      ? planStatusForBadge.trim()
      : "—";

  return (
    <header className="sticky top-0 z-30 border-b border-freuly-border-default bg-freuly-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-freuly-3 px-freuly-4 sm:px-freuly-6">
        <div className="flex min-w-0 items-center gap-freuly-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="freuly-focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-freuly-md text-freuly-text-secondary transition hover:bg-freuly-border-subtle hover:text-freuly-text-primary md:hidden"
            aria-label={t(dict, "dashboard.topBar.toggleMenu")}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <div className="min-w-0">
            <p className="truncate text-freuly-helper text-freuly-text-muted">{t(dict, "header.cabinet")}</p>
            <p className="truncate text-freuly-label text-freuly-text-primary">{name}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-freuly-2 sm:gap-freuly-3">
          <TopBarLogoutButton dict={dict} />
          <Badge
            variant={getStatusBadgeVariant(subscriptionStatus)}
            className="max-w-[5.5rem] truncate sm:max-w-none"
          >
            {subscriptionStatus}
          </Badge>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={name}
              className="h-9 w-9 shrink-0 rounded-full border border-freuly-border-default object-cover"
            />
          ) : (
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-freuly-border-default bg-freuly-border-subtle text-freuly-helper font-semibold text-freuly-text-secondary">
              {getInitials(name)}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
