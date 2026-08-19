import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";
import {
  PHOTO_FOCUS_ALGORITHM,
  PHOTO_FOCUS_VERSION,
  parseStoredPhotoFocus,
} from "@/lib/specialists/photoFocusMetadata";

export type PhotoFocusBackfillDecision = "skip" | "write";

/**
 * Idempotent backfill skip rule. Does not run detectors or write to the DB.
 *
 * Skip when the stored row is already this algorithm/version and the same photo.
 * Failed ("unusable") stamps also skip so retries do not hammer the same image.
 * Pass retryFailed=true to re-analyze unusable rows for the same identity.
 */
export function photoFocusBackfillDecision(input: {
  stored: unknown;
  photoIdentity: string;
  retryFailed?: boolean;
}): PhotoFocusBackfillDecision {
  const parsed = parseStoredPhotoFocus(input.stored);
  if (!parsed) return "write";
  if (parsed.version !== PHOTO_FOCUS_VERSION) return "write";
  if (parsed.algorithm !== PHOTO_FOCUS_ALGORITHM) return "write";
  if (parsed.photo_identity !== input.photoIdentity) return "write";
  if (parsed.status === "unusable" && input.retryFailed) return "write";
  return "skip";
}

export function isPublishedMainPhotoEligible(input: {
  status: string | null | undefined;
  isActive: boolean | null | undefined;
  isVisible: boolean | null | undefined;
  billingVisibilityBlocked: boolean | null | undefined;
  photoUrl: string | null | undefined;
}): boolean {
  if (!(VISIBLE_PUBLIC_SPECIALIST_STATUSES as readonly string[]).includes(input.status ?? "")) {
    return false;
  }
  if (input.isActive !== true) return false;
  if (input.isVisible !== true) return false;
  if (input.billingVisibilityBlocked === true) return false;
  return typeof input.photoUrl === "string" && input.photoUrl.trim().length > 0;
}
