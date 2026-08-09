import type { Lang } from "@/lib/i18n";
import {
  parseReviewMarkdownToAgreementBlocks,
  readReviewMarkdown,
} from "@/lib/legal/reviewMarkdown";
import {
  PARTNER_AGREEMENT_EFFECTIVE_DATE,
  PARTNER_AGREEMENT_TITLE,
  PARTNER_AGREEMENT_VERSION,
} from "@/content/partners/agreementMeta";

export type AgreementBlock =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

const GOVERNING_NOTE: Record<Exclude<Lang, "de">, string> = {
  ua: "Юридично визначальною є німецька версія. Цей переклад надано для зручності.",
  ru: "Юридически определяющей является немецкая версия. Этот перевод предоставлен для удобства.",
};

function blocksToPlainText(
  blocks: AgreementBlock[]
): string {
  return blocks
    .map((block) => {
      if (block.type === "h2") return block.text;
      if (block.type === "ul") return block.items.map((item) => `- ${item}`).join("\n");
      return block.text;
    })
    .join("\n\n");
}

export function getPartnerAgreement(lang: Lang): {
  version: string;
  effectiveDate: string;
  title: string;
  governingNote: string | null;
  blocks: AgreementBlock[];
} {
  const raw = readReviewMarkdown("partnerprogramm", lang);
  const blocks = parseReviewMarkdownToAgreementBlocks(raw);
  return {
    version: PARTNER_AGREEMENT_VERSION,
    effectiveDate: PARTNER_AGREEMENT_EFFECTIVE_DATE,
    title: `${PARTNER_AGREEMENT_TITLE[lang]} — Version ${PARTNER_AGREEMENT_VERSION}`,
    governingNote: lang === "de" ? null : GOVERNING_NOTE[lang],
    blocks,
  };
}

/** Canonical German text used for hashing / proof of accepted wording. */
export function getGermanAgreementPlainText(): string {
  return blocksToPlainText(getPartnerAgreement("de").blocks);
}
