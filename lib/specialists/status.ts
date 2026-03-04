export const VISIBLE_PUBLIC_SPECIALIST_STATUSES = [
  "approved", // legacy compatibility
  "published_unverified",
  "featured_verified",
] as const;

export const DASHBOARD_ALLOWED_SPECIALIST_STATUSES = [
  "approved", // legacy compatibility
  "paused", // legacy compatibility
  "draft",
  "published_unverified",
  "featured_verified",
  "blocked",
] as const;

export function isDashboardAllowedStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return (DASHBOARD_ALLOWED_SPECIALIST_STATUSES as readonly string[]).includes(status);
}
