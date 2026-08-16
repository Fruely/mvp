import { OPERATOR } from "../lib/render.mjs";

/**
 * LEGACY SNAPSHOT ONLY.
 *
 * The current Partnerprogramm-Bedingungen are maintained directly in
 * docs/legal/final-review/partnerprogramm.{de,ru,ua}.md and versioned through
 * content/partners/agreementMeta.ts. Do not use this generator data to overwrite
 * the current agreement without first synchronizing it with the active legal version.
 *
 * This snapshot intentionally preserves the previous generator structure for
 * historical tooling compatibility.
 */
export const PARTNERPROGRAMM_BLOCKS = [
  {
    type: "title",
    de: "# Partnerprogramm-Bedingungen Freuly",
    ru: "# Условия партнёрской программы Freuly",
    ua: "# Умови партнерської програми Freuly",
  },
  {
    type: "p",
    id: "pp-meta-01",
    de: "LEGACY SNAPSHOT — current version is maintained in docs/legal/final-review. Anbieter: " + OPERATOR.de,
    ru: "LEGACY SNAPSHOT — актуальная версия находится в docs/legal/final-review. Поставщик: " + OPERATOR.ru,
    ua: "LEGACY SNAPSHOT — актуальна версія міститься в docs/legal/final-review. Постачальник: " + OPERATOR.ua,
  },
];
