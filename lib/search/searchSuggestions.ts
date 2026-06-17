/**
 * Controlled, deterministic search suggestions for no-result queries (no AI).
 *
 * When a free-text query (`q`) returns no specialists, we surface a small set
 * of related query-based suggestions ("did you mean these directions?").
 * Each suggestion links back to query-based search (`/specialists?q=...`),
 * never to a raw category, so it can never widen into an "all specialists" list.
 *
 * Matching is intentionally narrow: a suggestion group is only shown when the
 * normalized query contains one of its explicit triggers. Unknown queries
 * (e.g. "космический адвокат") therefore yield no suggestions.
 */

export type SearchSuggestion = {
  /** Display text for the chip. */
  label: string;
  /** Value passed as `q` in the suggestion link. */
  query: string;
};

type SuggestionGroup = {
  triggers: readonly string[];
  suggestions: readonly SearchSuggestion[];
};

type SuggestionLang = "ru" | "ua" | "de";

/** Max chips returned regardless of how many groups match. */
const MAX_SUGGESTIONS = 8;

/** Build a suggestion whose chip label and search query are identical. */
function term(text: string): SearchSuggestion {
  return { label: text, query: text };
}

const SUGGESTION_GROUPS: Record<SuggestionLang, readonly SuggestionGroup[]> = {
  ru: [
    {
      triggers: [
        "ремонт квартиры",
        "мелкий ремонт",
        "мастер на час",
        "хаусмастер",
        "повесить полку",
        "собрать мебель",
      ],
      suggestions: [
        term("мелкий ремонт"),
        term("хаусмастер"),
        term("сантехник"),
        term("электрик"),
      ],
    },
    {
      triggers: [
        "ремонт компьютера",
        "настройка ноутбука",
        "компьютерная помощь",
      ],
      suggestions: [
        term("ремонт компьютера"),
        term("настройка ноутбука"),
        term("IT-поддержка"),
      ],
    },
    {
      triggers: ["сайт", "лендинг", "интернет-магазин"],
      suggestions: [
        term("создание сайта"),
        term("лендинг"),
        term("интернет-магазин"),
      ],
    },
    {
      triggers: ["логотип", "брендбук", "дизайн"],
      suggestions: [
        term("логотип"),
        term("брендбук"),
        term("графический дизайн"),
      ],
    },
    {
      triggers: ["налоговая декларация", "налоги", "finanzamt"],
      suggestions: [
        term("налоговая декларация"),
        term("налоговый консультант"),
        term("бухгалтер"),
      ],
    },
    {
      triggers: ["перевод", "перевод документов", "переводчик"],
      suggestions: [term("перевод документов"), term("переводчик")],
    },
  ],
  ua: [
    {
      triggers: [
        "ремонт квартири",
        "дрібний ремонт",
        "майстер на годину",
        "хаусмайстер",
        "повісити полицю",
        "зібрати меблі",
      ],
      suggestions: [
        term("дрібний ремонт"),
        term("хаусмайстер"),
        term("сантехнік"),
        term("електрик"),
      ],
    },
    {
      triggers: ["ремонт компʼютера", "налаштування ноутбука"],
      suggestions: [
        term("ремонт компʼютера"),
        term("налаштування ноутбука"),
        term("IT-підтримка"),
      ],
    },
    {
      triggers: ["сайт", "лендінг", "інтернет-магазин"],
      suggestions: [
        term("створення сайту"),
        term("лендінг"),
        term("інтернет-магазин"),
      ],
    },
    {
      triggers: ["логотип", "брендбук", "дизайн"],
      suggestions: [
        term("логотип"),
        term("брендбук"),
        term("графічний дизайн"),
      ],
    },
    {
      triggers: ["податкова декларація", "податки", "finanzamt"],
      suggestions: [
        term("податкова декларація"),
        term("податковий консультант"),
        term("бухгалтер"),
      ],
    },
    {
      triggers: ["переклад", "переклад документів", "перекладач"],
      suggestions: [term("переклад документів"), term("перекладач")],
    },
  ],
  de: [
    {
      triggers: [
        "wohnungsreparatur",
        "kleine reparaturen",
        "hausmeister",
        "regal aufhängen",
        "möbel montieren",
      ],
      suggestions: [
        term("kleine Reparaturen"),
        term("Hausmeister"),
        term("Klempner"),
        term("Elektriker"),
      ],
    },
    {
      triggers: ["computer reparieren", "laptop einrichten", "it hilfe"],
      suggestions: [
        term("Computer reparieren"),
        term("Laptop einrichten"),
        term("IT-Support"),
      ],
    },
    {
      triggers: ["webseite", "landingpage", "onlineshop"],
      suggestions: [
        term("Webseite erstellen"),
        term("Landingpage"),
        term("Onlineshop"),
      ],
    },
    {
      triggers: ["logo", "brandbook", "design"],
      suggestions: [term("Logo"), term("Brandbook"), term("Grafikdesign")],
    },
    {
      triggers: ["steuererklärung", "steuern", "finanzamt"],
      suggestions: [
        term("Steuererklärung"),
        term("Steuerberater"),
        term("Buchhaltung"),
      ],
    },
    {
      triggers: ["übersetzung", "dokumente übersetzen", "übersetzer"],
      suggestions: [term("Dokumente übersetzen"), term("Übersetzer")],
    },
  ],
};

/** Trim, collapse whitespace, lowercase. */
function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function resolveLang(lang?: string): SuggestionLang {
  const l = (lang ?? "").trim().toLowerCase();
  if (l === "de") return "de";
  if (l === "ua" || l === "uk") return "ua";
  return "ru";
}

/**
 * Return query-based suggestions for a no-result query.
 * Empty array when the query is blank or matches no controlled trigger.
 */
export function getSearchSuggestions(params: {
  q: string;
  lang?: string;
}): SearchSuggestion[] {
  const q = normalize(params.q ?? "");
  if (!q) return [];

  const groups = SUGGESTION_GROUPS[resolveLang(params.lang)];
  const out: SearchSuggestion[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    const matched = group.triggers.some((trigger) =>
      q.includes(normalize(trigger))
    );
    if (!matched) continue;

    for (const suggestion of group.suggestions) {
      const key = suggestion.query.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(suggestion);
      if (out.length >= MAX_SUGGESTIONS) return out;
    }
  }

  return out;
}
