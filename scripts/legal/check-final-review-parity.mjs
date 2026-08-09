#!/usr/bin/env node
/**
 * Parity checker for docs/legal/final-review/ triplets (de/ru/ua).
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REVIEW_DIR = join(__dirname, "../../docs/legal/final-review");

const MARKER_RE = /<!-- legal-section: ([a-z0-9-]+) -->/g;

const FORBIDDEN = [
  /\bsame as de\b/i,
  /\bsame as german\b/i,
  /\bcomplete mirror\b/i,
  /\bas above\b/i,
  /\bauto-renew\b/i,
  /\bauto-renewal\b/i,
  /\bautomatic debit\b/i,
  /\bidentisch\b/i,
  /\bTBD\b/,
  /\bTODO\b/,
  /\bFIXME\b/,
  /\[\.\.\.\]/,
  /см\.\s*DE/i,
  /див\.\s*DE/i,
  /аналогично/i,
  /как в DE/i,
  /полный эквивалент/i,
  /полный перевод разделов/i,
  /§\s*1\s*[–-]\s*§/,
  /аналогічно/i,
  /як у DE/i,
  /повний еквівалент/i,
  /повний переклад розділів/i,
  /see german/i,
];

const FORBIDDEN_AGB_DE = [
  /verlängern sich automatisch/i,
  /(?<!keine )automatische Verlängerung/i,
  /(?<!keine )automatische wiederkehrende Abbuchung/i,
  /Widerrufsrecht für Verbraucher/i,
  /formales Schlichtungsverfahren/i,
  /Freuly betreibt kein formales Schlichtungsverfahren/i,
  /ausschließlichen Gerichtsstand in Kirchhundem/i,
  /ausschließlicher Gerichtsstand.*Kirchhundem/i,
  /Export der Profildaten in einem gängigen/i,
];

const REQUIRED_AGB_DE = [
  /manuelle Verlängerung/i,
  /keine automatische wiederkehrende Abbuchung/i,
  /7 Kalendertage/i,
  /29 €/,
  /59 €/,
  /10 €/,
  /internes profilspezifisches Prioritätsmerkmal/i,
  /Zwingende gesetzliche Haftung bleibt unberührt/i,
  /15 Kalendertage/i,
  /30 Kalendertage/i,
];

const REQUIRED_SNIPPETS = [
  { label: "price-29", re: /29\s*€|29\s*EUR/i },
  { label: "price-59", re: /59\s*€|59\s*EUR/i },
  { label: "price-10", re: /10\s*€|10\s*EUR/i },
  { label: "7-day", re: /7\s*(Kalendertag|календарн|calendar)/i },
  { label: "90-day", re: /90\s*(Tag|day|дн|дні)/i },
  { label: "14-day", re: /14\s*(Kalendertag|календарн|calendar)/i },
  { label: "30-day", re: /30\s*(Kalendertag|календарн|calendar)/i },
  { label: "15-day", re: /15\s*(Kalendertag|календарн|calendar)/i },
];

function extractMarkers(content) {
  const markers = [];
  let m;
  const re = new RegExp(MARKER_RE.source, "g");
  while ((m = re.exec(content)) !== null) {
    markers.push({ id: m[1], index: m.index, end: m.index + m[0].length });
  }
  return markers;
}

function contentAfterMarker(content, marker, nextIndex) {
  const start = marker.end;
  const end = nextIndex ?? content.length;
  return content.slice(start, end).replace(/^[\r\n]+/, "").split(/\n<!-- legal-section:/)[0].trim();
}

function fail(msg) {
  console.error(`FAIL: ${msg}`);
}

let errors = 0;

if (!existsSync(REVIEW_DIR)) {
  fail(`Directory missing: ${REVIEW_DIR}`);
  process.exit(1);
}

const files = readdirSync(REVIEW_DIR).filter((f) => f.endsWith(".md") && f !== "README.md");
const bases = new Set(
  files
    .map((f) => f.replace(/\.(de|ru|ua)\.md$/, ""))
    .filter((b) => files.includes(`${b}.de.md`))
);

for (const base of [...bases].sort()) {
  const langs = ["de", "ru", "ua"];
  const byLang = {};
  for (const lang of langs) {
    const path = join(REVIEW_DIR, `${base}.${lang}.md`);
    if (!existsSync(path)) {
      fail(`${base}: missing ${lang} file`);
      errors++;
      continue;
    }
    byLang[lang] = readFileSync(path, "utf8");
  }

  const markerSets = langs.map((lang) => extractMarkers(byLang[lang]).map((x) => x.id));
  const deSet = new Set(markerSets[0]);
  for (const lang of ["ru", "ua"]) {
    const langSet = new Set(markerSets[langs.indexOf(lang)]);
    for (const id of deSet) {
      if (!langSet.has(id)) {
        fail(`${base}.${lang}.md: missing marker ${id} (present in de)`);
        errors++;
      }
    }
    for (const id of langSet) {
      if (!deSet.has(id)) {
        fail(`${base}.${lang}.md: extra marker ${id} (not in de)`);
        errors++;
      }
    }
  }

  for (const lang of langs) {
    const content = byLang[lang];
    const markers = extractMarkers(content);
    for (let i = 0; i < markers.length; i++) {
      const text = contentAfterMarker(content, markers[i], markers[i + 1]?.index);
      if (!text) {
        fail(`${base}.${lang}.md: empty content after marker ${markers[i].id}`);
        errors++;
      }
    }
    for (const pat of FORBIDDEN) {
      if (pat.test(content)) {
        fail(`${base}.${lang}.md: forbidden shorthand pattern ${pat}`);
        errors++;
      }
    }
  }
}

const allContent = files.map((f) => readFileSync(join(REVIEW_DIR, f), "utf8")).join("\n");
for (const { label, re } of REQUIRED_SNIPPETS) {
  if (!re.test(allContent)) {
    fail(`Required snippet not found anywhere: ${label}`);
    errors++;
  }
}

const agbDePath = join(REVIEW_DIR, "agb.de.md");
if (existsSync(agbDePath)) {
  const agbDe = readFileSync(agbDePath, "utf8");
  for (const pat of FORBIDDEN_AGB_DE) {
    if (pat.test(agbDe)) {
      fail(`agb.de.md: forbidden AGB content ${pat}`);
      errors++;
    }
  }
  for (const pat of REQUIRED_AGB_DE) {
    if (!pat.test(agbDe)) {
      fail(`agb.de.md: missing required AGB phrase ${pat}`);
      errors++;
    }
  }
}

if (errors > 0) {
  console.error(`\nParity check failed with ${errors} error(s).`);
  process.exit(1);
}

console.log("Parity check passed.");
process.exit(0);
