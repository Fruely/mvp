/** Statuses treated as already publicly enrolled (publish is idempotent). */
export const PUBLISHED_SPECIALIST_STATUSES = new Set([
  "published_unverified",
  "featured_verified",
  "approved",
  "paused",
]);

/** Only self-service smoke/dashboard revert is allowed from this status. */
export const SELF_UNPUBLISH_ALLOWED_STATUSES = new Set(["published_unverified"]);

/** Admin/moderated or lifecycle states — never self-downgraded via unpublish. */
export const PROTECTED_FROM_SELF_UNPUBLISH_STATUSES = new Set([
  "approved",
  "featured_verified",
  "paused",
  "blocked",
  "pending",
]);

export function isPublishedSpecialistStatus(status: string | null | undefined): boolean {
  return Boolean(status && PUBLISHED_SPECIALIST_STATUSES.has(status));
}
