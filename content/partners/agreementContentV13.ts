import fs from "node:fs";
import path from "node:path";
import type { Lang } from "@/lib/i18n";
import { parseReviewMarkdownToAgreementBlocks } from "@/lib/legal/reviewMarkdown";
import { PARTNER_AGREEMENT_TITLE } from "@/content/partners/agreementMeta";

export type AgreementBlock =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

const V = "1.3";
const D = "2026-08-16";
const GOVERNING_NOTE: Record<Exclude<Lang, "de">, string> = {
  ua: "Юридично визначальною є німецька версія. Цей переклад надано для зручності.",
  ru: "Юридически определяющей является немецкая версия. Этот перевод предоставлен для удобства.",
};

function readArchived(lang: Lang): string {
  return fs.readFileSync(
    path.join(process.cwd(), "docs/legal/archive", `partnerprogramm.v1.3.${lang}.md`),
    "utf8"
  );
}

function blocksToPlainText(blocks: AgreementBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === "h2") return block.text;
      if (block.type === "ul") return block.items.map((item) => `- ${item}`).join("\n");
      return block.text;
    })
    .join("\n\n");
}

export function getPartnerAgreementV13(lang: Lang): {
  version: string;
  effectiveDate: string;
  title: string;
  governingNote: string | null;
  blocks: AgreementBlock[];
} {
  const blocks = parseReviewMarkdownToAgreementBlocks(readArchived(lang));
  return {
    version: V,
    effectiveDate: D,
    title: `${PARTNER_AGREEMENT_TITLE[lang]} — Version ${V}`,
    governingNote: lang === "de" ? null : GOVERNING_NOTE[lang],
    blocks,
  };
}

export function getGermanAgreementPlainTextV13(): string {
  return blocksToPlainText(getPartnerAgreementV13("de").blocks);
}
