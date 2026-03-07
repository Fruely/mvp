"use client";

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

function getStatusBadgeClass(status: string): string {
  if (status === "active" || status === "early_access") return "bg-emerald-50 text-emerald-700";
  if (status === "grace") return "bg-amber-50 text-amber-700";
  if (status === "expired") return "bg-rose-50 text-rose-700";
  return "bg-gray-100 text-gray-700";
}

export default function TopBar({
  specialist,
  onMenuClick,
}: {
  specialist: SpecialistTopBarData;
  onMenuClick: () => void;
}) {
  const name = specialist?.name?.trim() || specialist?.first_name?.trim() || "—";
  const avatarUrl = specialist?.avatar_url?.trim() || "";
  const subscriptionStatusRaw = (specialist as Record<string, unknown>)?.subscription_status;
  const subscriptionStatus =
    typeof subscriptionStatusRaw === "string" && subscriptionStatusRaw.trim()
      ? subscriptionStatusRaw.trim()
      : "—";

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 md:hidden"
            aria-label="Toggle menu"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <div>
            <p className="text-sm text-gray-500">Кабинет специалиста</p>
            <p className="text-sm font-semibold text-gray-900">{name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <TopBarLogoutButton />
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(subscriptionStatus)}`}>
            {subscriptionStatus}
          </span>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={name}
              className="h-9 w-9 rounded-full border border-gray-200 object-cover"
            />
          ) : (
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700">
              {getInitials(name)}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
