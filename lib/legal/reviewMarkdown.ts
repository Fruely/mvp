import fs from "node:fs";
import path from "node:path";
import type { LegalBlock, LegalDocument, LegalPublicLang } from "@/content/legal/types";
import { brandPlanText } from "@/lib/pricing/planDisplayBranding";
import { applyPublicLegalAmendments } from "./publicLegalAmendments";
import { applyPublicCommercialAmendments } from "./publicCommercialAmendments";
import { applyPublicCommercialAmendmentsV2 } from "./publicCommercialAmendmentsV2";
import { applyPublicSpecialistRulesAmendments } from "./publicSpecialistRulesAmendments";
import { applyPublicLegalPostFixes } from "./publicLegalPostFixes";

const REVIEW_DIR = path.join(process.cwd(), "docs/legal/final-review");
const MARKER_LINE_RE = /^\s*<!--\s*legal-section:[^>]+-->\s*$/;

export type ReviewDocumentSlug =
  | "agb"
  | "specialist-rules"
  | "datenschutz"
  | "partnerprogramm"
  | "checkout-copy"
  | "cookie-copy"
  | "ranking";

function normalizeInlineMarkdown(text: string): string {
  return brandPlanText(text.replace(/\*\*(.+?)\*\*/g, "$1"));
}

export function stripReviewMarkers(raw: string): string {
  return raw
    .split("\n")
    .filter((line) => !MARKER_LINE_RE.test(line))
    .join("\n")
    .trim();
}

export function readReviewMarkdown(slug: ReviewDocumentSlug, lang: LegalPublicLang): string {
  const filePath = path.join(REVIEW_DIR, `${slug}.${lang}.md`);
  const raw = fs.readFileSync(filePath, "utf8");
  const amended = applyPublicLegalAmendments(slug, lang, raw);
  const commerciallyAligned = applyPublicCommercialAmendments(slug, lang, amended);
  const commerciallyAlignedV2 = applyPublicCommercialAmendmentsV2(slug, lang, commerciallyAligned);
  const specialistRulesAligned = applyPublicSpecialistRulesAmendments(slug, lang, commerciallyAlignedV2);
  const postFixed = applyPublicLegalPostFixes(slug, lang, specialistRulesAligned);
  return brandPlanText(stripReviewMarkers(postFixed));
}

function parseBlocks(sectionBody: string): LegalBlock[] {
  const blocks: LegalBlock[] = [];
  const chunks = sectionBody.split(/\n(?=### )/);

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("### ")) {
      const firstNewline = trimmed.indexOf("\n");
      const heading =
        firstNewline === -1
          ? trimmed.replace(/^###\s+/, "").trim()
          : trimmed.slice(4, firstNewline).trim();
      if (heading) {
        blocks.push({ type: "p", text: normalizeInlineMarkdown(heading) });
      }
      const rest = firstNewline === -1 ? "" : trimmed.slice(firstNewline + 1).trim();
      if (rest) {
        blocks.push(...parseParagraphAndListBlocks(rest));
      }
      continue;
    }

    blocks.push(...parseParagraphAndListBlocks(trimmed));
  }

  return blocks;
}

function parseParagraphAndListBlocks(text: string): LegalBlock[] {
  const blocks: LegalBlock[] = [];
  const paragraphs = text.split(/\n\n+/);

  for (const paragraph of paragraphs) {
    const lines = paragraph
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) continue;

    const listItems = lines.filter((line) => line.startsWith("- "));
    if (listItems.length === lines.length) {
      blocks.push({
        type: "ul",
        items: listItems.map((line) => normalizeInlineMarkdown(line.replace(/^-\s+/, ""))),
      });
      continue;
    }

    blocks.push({ type: "p", text: normalizeInlineMarkdown(lines.join("\n")) });
  }

  return blocks;
}

export function parseReviewMarkdownToLegalDocument(
  raw: string,
  options: {
    lang: LegalPublicLang;
    metaTitle: string;
    metaDescription: string;
    translationNotice?: string;
  }
): LegalDocument {
  const text = stripReviewMarkers(raw);
  const lines = text.split("\n");

  let title = "";
  const preamble: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i += 1;
      continue;
    }
    if (line.startsWith("# ")) {
      title = normalizeInlineMarkdown(line.slice(2).trim());
      i += 1;
      break;
    }
    i += 1;
  }

  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.startsWith("## ")) break;
    if (line) preamble.push(normalizeInlineMarkdown(line));
    i += 1;
  }

  const stand =
    preamble.find((line) => /august|август|серпень|2026|version|верс|версі/i.test(line)) ??
    preamble[0] ??
    "August 2026";

  const subtitle = preamble.length > 1 ? preamble.find((line) => line !== stand) : undefined;

  const sections: LegalDocument["sections"] = [];

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line.startsWith("## ")) {
      i += 1;
      continue;
    }

    const sectionTitle = normalizeInlineMarkdown(line.slice(3).trim());
    i += 1;
    const bodyLines: string[] = [];

    while (i < lines.length) {
      const next = lines[i];
      if (next.trim().startsWith("## ")) break;
      bodyLines.push(next);
      i += 1;
    }

    const blocks = parseBlocks(bodyLines.join("\n").trim());
    if (blocks.length) {
      sections.push({ title: sectionTitle, blocks });
    }
  }

  return {
    metaTitle: brandPlanText(options.metaTitle),
    metaDescription: brandPlanText(options.metaDescription),
    title,
    subtitle,
    stand,
    translationNotice: options.lang === "de" ? undefined : options.translationNotice,
    sections,
  };
}

const TRANSLATION_NOTICE: Record<Exclude<LegalPublicLang, "de">, string> = {
  ua: "Цей переклад надано для зручності. У разі розбіжностей визначальною є німецька версія.",
  ru: "Этот перевод предоставлен для удобства. В случае расхождений определяющей является немецкая версия.",
};

export function getReviewLegalDocument(
  slug: ReviewDocumentSlug,
  lang: LegalPublicLang,
  meta: { metaTitle: string; metaDescription: string }
): LegalDocument {
  const raw = readReviewMarkdown(slug, lang);
  return parseReviewMarkdownToLegalDocument(raw, {
    lang,
    metaTitle: meta.metaTitle,
    metaDescription: meta.metaDescription,
    translationNotice: lang === "de" ? undefined : TRANSLATION_NOTICE[lang],
  });
}

export type AgreementBlock =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

export function parseReviewMarkdownToAgreementBlocks(raw: string): AgreementBlock[] {
  const text = stripReviewMarkers(raw);
  const lines = text.split("\n");
  const blocks: AgreementBlock[] = [];

  let i = 0;
  while (i < lines.length && !lines[i].trim().startsWith("## ")) {
    const line = lines[i].trim();
    if (line && !line.startsWith("# ")) {
      blocks.push({ type: "p", text: normalizeInlineMarkdown(line) });
    }
    i += 1;
  }

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line.startsWith("## ")) {
      i += 1;
      continue;
    }

    blocks.push({ type: "h2", text: normalizeInlineMarkdown(line.slice(3).trim()) });
    i += 1;
    const bodyLines: string[] = [];

    while (i < lines.length) {
      const next = lines[i];
      if (next.trim().startsWith("## ")) break;
      bodyLines.push(next);
      i += 1;
    }

    for (const block of parseBlocks(bodyLines.join("\n").trim())) {
      if (block.type === "ul") {
        blocks.push({ type: "ul", items: block.items });
      } else if (block.type === "p") {
        blocks.push({ type: "p", text: block.text });
      }
    }
  }

  return blocks;
}
