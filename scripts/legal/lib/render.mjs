/** @typedef {{ id: string; de: string; ru: string; ua: string }} Para */
/** @typedef {{ de: string; ru: string; ua: string }} Heading */

/**
 * @param {Array<
 *   | { type: "title"; de: string; ru: string; ua: string }
 *   | { type: "h2"; de: string; ru: string; ua: string }
 *   | { type: "h3"; de: string; ru: string; ua: string }
 *   | { type: "p"; id: string; de: string; ru: string; ua: string }
 *   | { type: "ul"; id: string; de: string[]; ru: string[]; ua: string[] }
 * >} blocks
 * @param {"de" | "ru" | "ua"} lang
 */
export function renderMarkdown(blocks, lang) {
  const lines = [];
  for (const block of blocks) {
    if (block.type === "title") {
      lines.push(block[lang], "");
      continue;
    }
    if (block.type === "h2") {
      lines.push(`## ${block[lang]}`, "");
      continue;
    }
    if (block.type === "h3") {
      lines.push(`### ${block[lang]}`, "");
      continue;
    }
    if (block.type === "p") {
      lines.push(`<!-- legal-section: ${block.id} -->`, block[lang], "");
      continue;
    }
    if (block.type === "ul") {
      lines.push(`<!-- legal-section: ${block.id} -->`);
      for (const item of block[lang]) {
        lines.push(`- ${item}`);
      }
      lines.push("");
    }
  }
  return `${lines.join("\n").trim()}\n`;
}

/** @param {Array<{ id: string } & Record<string, unknown>>} blocks */
export function countMarkers(blocks) {
  return blocks.filter((b) => b.type === "p" || b.type === "ul").length;
}

export const OPERATOR = {
  de: "Natalia Sheshenia, handelnd unter der Geschäftsbezeichnung Sheshenia – Freuly, Hofolper Straße 46, 57399 Kirchhundem, Deutschland. E-Mail: freuly.de@gmail.com. Telefon: +49 160 92686432. USt-IdNr.: DE464033560. W-IdNr.: DE464033560-00001.",
  ru: "Natalia Sheshenia, действующая под коммерческим обозначением Sheshenia – Freuly, Hofolper Straße 46, 57399 Kirchhundem, Deutschland. E-mail: freuly.de@gmail.com. Телефон: +49 160 92686432. USt-IdNr.: DE464033560. W-IdNr.: DE464033560-00001.",
  ua: "Natalia Sheshenia, яка діє під комерційним найменуванням Sheshenia – Freuly, Hofolper Straße 46, 57399 Kirchhundem, Deutschland. E-mail: freuly.de@gmail.com. Телефон: +49 160 92686432. USt-IdNr.: DE464033560. W-IdNr.: DE464033560-00001.",
};
