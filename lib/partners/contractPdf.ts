import path from "node:path";
import PDFDocument from "pdfkit";
import type { Lang } from "@/lib/i18n";
import { getPartnerAgreement } from "@/content/partners/agreementContent";
import { getPartnerAgreementV10 } from "@/content/partners/agreementContentV10";
import {
  PARTNER_AGREEMENT_LEGACY_VERSION,
  PARTNER_AGREEMENT_VERSION,
} from "@/content/partners/agreementMeta";
import { getFreulyPublicIdentity, formatFreulyWidnr } from "@/lib/legal/freulyIdentity";
import { resolveAgreementVersion } from "@/lib/partners/agreementHash";
import { publicPartnerRef } from "@/lib/partners/publicPartnerRef";

const FONT_REGULAR = path.join(
  process.cwd(),
  "node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf"
);
const FONT_BOLD = path.join(
  process.cwd(),
  "node_modules/dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf"
);

const DOC_TITLES: Record<Lang, string> = {
  de: "Bestätigung über den Beitritt zum Freuly-Partnerprogramm",
  ru: "Подтверждение присоединения к партнёрской программе Freuly",
  ua: "Підтвердження приєднання до партнерської програми Freuly",
};

const ACCEPTANCE_STATEMENT: Record<Lang, string> = {
  de: "Der Partner hat die Partnerprogramm-Bedingungen in der angegebenen Version am angegebenen Zeitpunkt elektronisch angenommen. Die Annahme wurde dem authentifizierten Freuly-Benutzerkonto und dem angegebenen Partnerkonto zugeordnet.",
  ru: "Партнёр электронно принял условия партнёрской программы в указанной версии в указанное время. Принятие привязано к аутентифицированной учётной записи Freuly и указанному партнёрскому аккаунту.",
  ua: "Партнер електронно прийняв умови партнерської програми у зазначеній версії у зазначений час. Прийняття прив’язано до автентифікованого облікового запису Freuly та зазначеного партнерського акаунту.",
};

type BuildPdfInput = {
  documentNumber: string;
  agreementVersion: string;
  agreementLocale: Lang;
  agreementTextSha256: string;
  acceptedAt: string;
  issuedAt: string;
  partnerId: string;
  partnerEmail: string;
  partnerName: string | null;
  auditReference: string | null;
};

function agreementForVersion(lang: Lang, version: string) {
  if (resolveAgreementVersion(version) === PARTNER_AGREEMENT_LEGACY_VERSION) {
    return getPartnerAgreementV10(lang);
  }
  return getPartnerAgreement(lang);
}

function blocksToText(
  blocks: Array<
    | { type: "h2"; text: string }
    | { type: "p"; text: string }
    | { type: "ul"; items: string[] }
  >
): string {
  return blocks
    .map((b) => {
      if (b.type === "h2") return `\n${b.text}\n`;
      if (b.type === "ul") return b.items.map((i) => `• ${i}`).join("\n");
      return b.text;
    })
    .join("\n\n");
}

function formatDateTime(iso: string, lang: Lang): string {
  try {
    const locale = lang === "de" ? "de-DE" : lang === "ru" ? "ru-RU" : "uk-UA";
    return new Date(iso).toLocaleString(locale, { timeZone: "Europe/Berlin" });
  } catch {
    return iso;
  }
}

export async function buildPartnerContractPdf(input: BuildPdfInput): Promise<Buffer> {
  const lang = input.agreementLocale;
  const operator = getFreulyPublicIdentity();
  const partnerRef = publicPartnerRef(input.partnerId);
  const displayLang: Lang = ["de", "ru", "ua"].includes(lang) ? lang : "de";

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      info: {
        Title: DOC_TITLES[displayLang],
        Author: operator.businessName,
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.registerFont("regular", FONT_REGULAR);
    doc.registerFont("bold", FONT_BOLD);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    let pageNumber = 1;

    function footer() {
      doc
        .font("regular")
        .fontSize(8)
        .fillColor("#666666")
        .text(
          `${input.documentNumber} · ${formatDateTime(input.issuedAt, "de")} · Seite ${pageNumber}`,
          doc.page.margins.left,
          doc.page.height - doc.page.margins.bottom + 10,
          { width: pageWidth, align: "center" }
        );
    }

    function heading(text: string) {
      doc.moveDown(0.5);
      doc.font("bold").fontSize(14).fillColor("#111111").text(text, { width: pageWidth });
      doc.moveDown(0.3);
    }

    function paragraph(text: string) {
      doc.font("regular").fontSize(10).fillColor("#222222").text(text, { width: pageWidth });
      doc.moveDown(0.4);
    }

    function field(label: string, value: string) {
      doc.font("bold").fontSize(10).fillColor("#111111").text(`${label}: `, { continued: true });
      doc.font("regular").text(value, { width: pageWidth });
    }

    doc.font("bold").fontSize(16).fillColor("#111111").text(DOC_TITLES[displayLang], {
      width: pageWidth,
    });
    doc.moveDown(0.8);

    heading("A. Dokument / Document identity");
    field("Dokumentnummer", input.documentNumber);
    field("Agreement version", input.agreementVersion);
    field("Ausstellungsdatum", formatDateTime(input.issuedAt, displayLang));
    field("Annahmezeitpunkt", formatDateTime(input.acceptedAt, displayLang));
    field("Angezeigte Sprache", displayLang.toUpperCase());
    field("Canonical DE SHA-256", input.agreementTextSha256);
    field("Partner-Referenz", partnerRef);
    if (input.auditReference) field("Audit-Referenz", input.auditReference);

    heading("B. Freuly Betreiber");
    paragraph(
      [
        operator.legalName,
        `handelnd unter der Geschäftsbezeichnung ${operator.businessName}`,
        operator.street,
        operator.cityLine,
        operator.country,
        `E-Mail: ${operator.email}`,
        `Telefon: ${operator.phone}`,
        `Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: ${operator.vatId}`,
        `Wirtschafts-Identifikationsnummer: ${formatFreulyWidnr()}`,
      ].join("\n")
    );

    heading("C. Partner");
    field("E-Mail", input.partnerEmail);
    if (input.partnerName) field("Name", input.partnerName);
    field("Partner-Referenz", partnerRef);

    heading("D. Annahmeerklärung");
    paragraph(ACCEPTANCE_STATEMENT[displayLang]);

    heading("E. Vertragsinhalt — maßgebliche deutsche Fassung");
    paragraph(
      input.agreementVersion === PARTNER_AGREEMENT_LEGACY_VERSION
        ? "Nachfolgend der vollständige Wortlaut der Partnerprogramm-Bedingungen Version 1.0 (deutsche kanonische Fassung)."
        : "Nachfolgend der vollständige Wortlaut der Partnerprogramm-Bedingungen Version 1.1 (deutsche kanonische Fassung)."
    );

    const deAgreement = agreementForVersion("de", input.agreementVersion);
    paragraph(blocksToText(deAgreement.blocks));

    if (displayLang !== "de") {
      doc.addPage();
      pageNumber += 1;
      footer();
      heading(`Informationelle Übersetzung (${displayLang.toUpperCase()})`);
      paragraph(
        "Die deutsche Fassung ist rechtlich maßgeblich. Nachfolgend die zur Annahme angezeigte informationelle Übersetzung."
      );
      const localized = agreementForVersion(displayLang, input.agreementVersion);
      paragraph(blocksToText(localized.blocks));
    }

    footer();
    doc.end();
  });
}
