import type { LegalPublicLang } from "@/content/legal/types";

/**
 * Historical commercial version bridge.
 *
 * Current commercial wording is applied in publicCommercialAmendmentsV2.
 * This layer only advances the earlier public document version to 1.2 so the
 * next layer can apply the free-entry 1.3 wording without carrying obsolete
 * paid-publication copy in two places.
 */
function bumpCommercialVersion(raw: string) {
  return raw
    .replace("Version 1.1 — August 2026", "Version 1.2 — August 2026")
    .replace("Версия 1.1 — август 2026", "Версия 1.2 — август 2026")
    .replace("Версія 1.1 — серпень 2026", "Версія 1.2 — серпень 2026")
    .replace("Version 1.0 — August 2026", "Version 1.2 — August 2026")
    .replace("Версия 1.0 — август 2026", "Версия 1.2 — август 2026")
    .replace("Версія 1.0 — серпень 2026", "Версія 1.2 — серпень 2026");
}

export function applyPublicCommercialAmendments(
  slug: string,
  _lang: LegalPublicLang,
  raw: string,
): string {
  if (slug !== "agb") return raw;
  return bumpCommercialVersion(raw);
}
