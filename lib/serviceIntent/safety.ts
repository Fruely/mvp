import {
  SERVICE_INTENT_LICENSED_REASONS,
  type ServiceIntentSafety,
  type ServiceIntentSafetyMessageCode,
  type ServiceIntentSafetyReason,
  type ServiceIntentSafetyVerdict,
} from "./contract";
import type { ServiceIntentModelSafety } from "./modelResponse";

/**
 * The model's safety opinion is a preliminary signal. Ordinary code decides what
 * the verdict is allowed to be, and nothing here writes to the database, sends a
 * notification or publishes anything.
 *
 * Two rules dominate:
 * - a regulated but legitimate profession is never auto-blocked;
 * - doubt resolves to manual review, never to a block.
 */

/** Below this the model is not trusted with a terminal block. */
export const SAFETY_BLOCK_CONFIDENCE_THRESHOLD = 0.75;

const PROHIBITED_REASONS: readonly ServiceIntentSafetyReason[] = [
  "weapons",
  "drugs",
  "violence",
  "sexual_services",
  "fraud",
  "self_harm",
];

function isLicensed(reason: ServiceIntentSafetyReason): boolean {
  return SERVICE_INTENT_LICENSED_REASONS.includes(reason);
}

function messageCodeFor(
  verdict: ServiceIntentSafetyVerdict,
  reasons: readonly ServiceIntentSafetyReason[],
): ServiceIntentSafetyMessageCode {
  if (verdict === "blocked") return "safety_not_supported";
  if (verdict === "manual_review") {
    return reasons.includes("unusable_content") || reasons.includes("unclear_intent")
      ? "safety_needs_details"
      : "safety_manual_review";
  }
  if (verdict === "restricted") return "safety_licensed_service";
  return "safety_ok";
}

/**
 * Deterministic pre-check that runs before any model call, so obviously unusable
 * content costs nothing. It is not a banned-word list: it only asks whether the
 * text carries enough letters to describe anything at all.
 */
export function isUnusableContent(text: string): boolean {
  // A character is a letter when it has distinct cases. This covers Latin,
  // Cyrillic and German text without a Unicode property escape, which the
  // project's TypeScript target does not allow.
  const letters: string[] = [];
  for (const character of Array.from(text)) {
    if (character.toLowerCase() !== character.toUpperCase()) {
      letters.push(character.toLowerCase());
    }
  }
  if (letters.length < 3) return true;
  // A single repeated letter such as "aaaaaaa" carries no request.
  return new Set(letters).size < 2;
}

export function unusableContentSafety(): ServiceIntentSafety {
  const reasons: ServiceIntentSafetyReason[] = ["unusable_content"];
  return {
    verdict: "manual_review",
    reason_codes: reasons,
    confidence: 1,
    message_code: messageCodeFor("manual_review", reasons),
  };
}

/**
 * Clamps the model verdict to what code is willing to accept and attaches a
 * stable, localizable message code.
 */
export function normalizeModelSafety(model: ServiceIntentModelSafety): ServiceIntentSafety {
  const reasons = model.reason_codes;
  const licensedOnly = reasons.length > 0 && reasons.every(isLicensed);
  const hasProhibited = reasons.some((reason) => PROHIBITED_REASONS.includes(reason));

  let verdict: ServiceIntentSafetyVerdict = model.verdict;

  if (verdict === "blocked") {
    if (licensedOnly) {
      // Medicine, law, finance and veterinary work are legitimate services.
      verdict = "manual_review";
    } else if (!hasProhibited || model.confidence < SAFETY_BLOCK_CONFIDENCE_THRESHOLD) {
      // Doubt, or a block without a prohibited reason, becomes manual review.
      verdict = "manual_review";
    }
  }

  if (verdict === "allowed" && hasProhibited) {
    // A prohibited signal cannot coexist with a clean pass.
    verdict = "manual_review";
  }

  if (verdict === "allowed" && licensedOnly) {
    verdict = "restricted";
  }

  return {
    verdict,
    reason_codes: reasons,
    confidence: model.confidence,
    message_code: messageCodeFor(verdict, reasons),
  };
}
