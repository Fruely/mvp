import { isPublicLeadTargetSpecialist } from "@/lib/specialists/status";
import { languagesOverlap } from "./languages";

export const MATCH_REASON_CODES = [
  "category_match",
  "language_match",
  "format_match",
  "location_match",
  "location_not_required",
] as const;

export type MatchReasonCode = (typeof MATCH_REASON_CODES)[number];

export type MatchWorkFormat = "online" | "offline" | "hybrid";

/** Confirmed request facts used for matching. Contacts and free text are absent on purpose. */
export type MatchRequest = {
  id: string;
  categoryId: string | null;
  serviceLanguages: readonly string[];
  workFormat: MatchWorkFormat;
  city: string | null;
  postalCode: string | null;
};

export type MatchCandidate = {
  id: string;
  categoryIds: readonly string[];
  languages: readonly string[];
  workFormat: string | null;
  city: string | null;
  postalCode: string | null;
  status: string | null;
  isActive: boolean | null;
  isVisible: boolean | null;
  billingVisibilityBlocked: boolean | null;
  isTest: boolean | null;
};

export type MatchDecision = {
  eligible: boolean;
  reasons: MatchReasonCode[];
};

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLocaleLowerCase();
}

function formatCompatible(request: MatchWorkFormat, specialist: string | null): boolean {
  if (specialist !== "online" && specialist !== "offline" && specialist !== "hybrid") return false;
  if (request === "hybrid") return true;
  if (request === "online") return specialist === "online" || specialist === "hybrid";
  return specialist === "offline" || specialist === "hybrid";
}

/**
 * City or postal equality only. Request rows have no coordinates, so radius
 * kilometres are not invented here.
 */
function locationDecision(
  request: MatchRequest,
  candidate: MatchCandidate,
): { ok: boolean; reason: MatchReasonCode | null } {
  const physicalSpecialist = candidate.workFormat === "offline" || candidate.workFormat === "hybrid";
  if (request.workFormat === "online" || (request.workFormat === "hybrid" && !physicalSpecialist)) {
    return { ok: true, reason: "location_not_required" };
  }

  const requestCity = norm(request.city);
  const specialistCity = norm(candidate.city);
  if (requestCity && specialistCity && requestCity === specialistCity) {
    return { ok: true, reason: "location_match" };
  }

  const requestPostal = norm(request.postalCode);
  const specialistPostal = norm(candidate.postalCode);
  if (requestPostal && specialistPostal && requestPostal === specialistPostal) {
    return { ok: true, reason: "location_match" };
  }

  return { ok: false, reason: null };
}

export function evaluateMatch(request: MatchRequest, candidate: MatchCandidate): MatchDecision {
  if (
    !isPublicLeadTargetSpecialist({
      status: candidate.status,
      is_active: candidate.isActive,
      is_visible: candidate.isVisible,
      billing_visibility_blocked: candidate.billingVisibilityBlocked,
      is_test: candidate.isTest,
    })
  ) {
    return { eligible: false, reasons: [] };
  }

  const reasons: MatchReasonCode[] = [];

  if (request.categoryId) {
    if (!candidate.categoryIds.includes(request.categoryId)) {
      return { eligible: false, reasons: [] };
    }
    reasons.push("category_match");
  }

  if (request.serviceLanguages.length > 0) {
    if (!languagesOverlap(request.serviceLanguages, candidate.languages)) {
      return { eligible: false, reasons: [] };
    }
    reasons.push("language_match");
  }

  if (!formatCompatible(request.workFormat, candidate.workFormat)) {
    return { eligible: false, reasons: [] };
  }
  reasons.push("format_match");

  const location = locationDecision(request, candidate);
  if (!location.ok || !location.reason) return { eligible: false, reasons: [] };
  reasons.push(location.reason);

  return {
    eligible: true,
    reasons: MATCH_REASON_CODES.filter((code) => reasons.includes(code)),
  };
}
