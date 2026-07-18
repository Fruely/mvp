import type { PartnerStatus } from "./types";

/** Access modes for partner dashboard / APIs. */
export type PartnerAccessMode = "full" | "read_only" | "history_only" | "denied";

export function partnerAccessMode(status: PartnerStatus): PartnerAccessMode {
  switch (status) {
    case "active":
      return "full";
    case "paused":
      return "read_only";
    case "disabled":
      return "history_only";
    case "pending":
    case "rejected":
    default:
      return "denied";
  }
}

export function canAccessPartnerDashboard(status: PartnerStatus): boolean {
  const mode = partnerAccessMode(status);
  return mode === "full" || mode === "read_only" || mode === "history_only";
}
