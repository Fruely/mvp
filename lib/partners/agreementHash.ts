import { createHash } from "node:crypto";
import { getGermanAgreementPlainText } from "@/content/partners/agreementContent";
import { PARTNER_AGREEMENT_VERSION } from "@/content/partners/agreementMeta";

/** SHA-256 of the canonical German Partnerprogramm-Bedingungen plain text. */
export function getPartnerAgreementTextSha256(): string {
  return createHash("sha256").update(getGermanAgreementPlainText(), "utf8").digest("hex");
}

export function getPartnerAgreementProofPayload(locale?: string | null) {
  return {
    agreement_version: PARTNER_AGREEMENT_VERSION,
    agreement_locale: locale || null,
    agreement_text_sha256: getPartnerAgreementTextSha256(),
    agreement_language_canonical: "de",
  };
}
