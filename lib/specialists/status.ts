export const VISIBLE_PUBLIC_SPECIALIST_STATUSES = [
  "approved", // legacy compatibility
  "published_unverified",
  "featured_verified",
] as const;

export const DASHBOARD_ALLOWED_SPECIALIST_STATUSES = [
  "draft",
  "published_unverified",
  "featured_verified",
] as const;

export function isDashboardAllowedStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return (DASHBOARD_ALLOWED_SPECIALIST_STATUSES as readonly string[]).includes(status);
}

/** Matches public specialist profile/search eligibility for client-facing mutations. */
export function isPublicLeadTargetSpecialist(row: {
  status?: string | null;
  is_active?: boolean | null;
  is_visible?: boolean | null;
  billing_visibility_blocked?: boolean | null;
  is_test?: boolean | null;
}): boolean {
  return (
    row.is_active === true &&
    row.is_visible === true &&
    row.billing_visibility_blocked !== true &&
    row.is_test !== true &&
    (VISIBLE_PUBLIC_SPECIALIST_STATUSES as readonly string[]).includes(row.status ?? "")
  );
}
