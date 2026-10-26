import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { youmeDatenschutzBlocks, youmeDatenschutzPlainText } from "../../lib/legal/youmeDatenschutzBlocks.mjs";

const root = new URL("../../", import.meta.url);
const markdown = readFileSync(new URL("content/legal/youme-datenschutz.de.md", root), "utf8");
const bundled = readFileSync(new URL("content/legal/youmeDatenschutzSource.ts", root), "utf8");
const prefix = "export const youmeDatenschutzSource = ";
const start = bundled.indexOf(prefix);
assert.ok(start >= 0);
const embedded = JSON.parse(bundled.slice(start + prefix.length).replace(/;\s*$/, ""));

assert.equal(embedded, markdown);

const expectedLines = markdown
  .replace(/\r\n/g, "\n")
  .split("\n")
  .filter((line) => line.trim() !== "")
  .map((line) => line.replace(/^(?:# |## |- )/, "").replace(/  $/, ""));
assert.deepEqual(youmeDatenschutzPlainText(markdown).split("\n"), expectedLines);

const blocks = youmeDatenschutzBlocks(markdown);
assert.deepEqual(
  blocks.filter((block) => block.type === "h1").map((block) => block.text),
  ["Datenschutzerklärung YouMe"]
);
assert.deepEqual(
  blocks.filter((block) => block.type === "h2").map((block) => block.text),
  [
    "§ 1 Verantwortlicher",
    "§ 2 Gegenstand",
    "§ 3 Konto",
    "§ 4 Anfrage, Angebot und Zuordnung",
    "§ 5 Spracheingabe",
    "§ 6 Chat, Anhänge und Beschwerden",
    "§ 7 Mitteilungen",
    "§ 8 Zahlung",
    "§ 9 Technische Fehler",
    "§ 10 Übermittlung außerhalb des Europäischen Wirtschaftsraums",
    "§ 11 Empfänger",
    "§ 12 Speicherdauer",
    "§ 13 Rechte",
    "§ 14 Erforderliche Angaben",
    "§ 15 Änderungen",
  ]
);
assert.equal(blocks.filter((block) => block.type === "ul").length, 1);
assert.equal(blocks.find((block) => block.type === "ul").items.length, 10);
const hardBreaks = blocks
  .filter((block) => block.type === "p")
  .flatMap((block) => block.lines)
  .filter((line) => line.hardBreak)
  .map((line) => line.text);
assert.deepEqual(hardBreaks, [
  "Fassung für die mobilen Apps YouMe auf Android und iOS.",
  "E-Mail: freuly.de@gmail.com",
]);
assert.match(markdown, /Gewerbe Sheshenia-Freuly/);
assert.match(markdown, /https:\/\/photon\.komoot\.io\/api\//);
assert.match(markdown, /Diese Erklärung wird angepasst, wenn sich die Verarbeitung in den Apps oder die Rechtslage ändert\./);
console.log("youme datenschutz text check ok", expectedLines.length, "lines");
