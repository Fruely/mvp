/**
 * Static synonym dictionary for free-text specialist search (no AI).
 * Maps common everyday service phrases to category slugs and expanded search terms.
 *
 * Slugs are taken from locales/categories.* and Supabase category seeds.
 * When a slug may exist only in DB (electrician, plumber, photographer), it is noted inline.
 */

import { sanitizeCityFilter as sanitizeSearchToken } from "@/lib/search/placeSearch";

export const MAX_SEARCH_QUERY_LENGTH = 120;
export const MAX_SEARCH_TERMS = 16;

type SynonymGroup = {
  categorySlugs: readonly string[];
  terms: readonly string[];
};

const SYNONYM_GROUPS: readonly SynonymGroup[] = [
  // ---------------------------------------------------------------------------
  // House & garden — repairs, handyman, assembly, plumbing, electrical, garden
  // ---------------------------------------------------------------------------
  {
    // Broad single-word repair queries — discovery fallback across repair categories.
    categorySlugs: ["small-repairs", "housemaster", "computer-repair"],
    terms: ["ремонт", "reparatur"],
  },
  {
    categorySlugs: ["small-repairs"],
    terms: [
      // RU — general / finishing repairs
      "мелкий ремонт",
      "мелкие работы",
      "ремонт квартиры",
      "ремонт комнаты",
      "ремонт дома",
      "поклеить обои",
      "переклеить обои",
      "обои",
      "покрасить стены",
      "покраска стен",
      "шпаклевка",
      "шпаклёвка",
      "поставить плинтус",
      "плинтус",
      "починить дверь",
      "дверь не закрывается",
      "починить окно",
      "окно не закрывается",
      "ремонт крыши",
      "перекрыть крышу",
      // UK
      "дрібний ремонт",
      "дрібні роботи",
      "ремонт квартири",
      "ремонт кімнати",
      "ремонт будинку",
      "поклеїти шпалери",
      "переклеїти шпалери",
      "шпалери",
      "пофарбувати стіни",
      "шпаклівка",
      "поставити плінтус",
      "полагодити двері",
      "двері не зачиняються",
      "полагодити вікно",
      "вікно не зачиняється",
      "ремонт даху",
      "перекрити дах",
      // DE
      "kleinreparatur",
      "kleine reparaturen",
      "wohnung renovieren",
      "zimmer renovieren",
      "haus renovieren",
      "tapezieren",
      "tapete kleben",
      "wände streichen",
      "malerarbeiten",
      "spachteln",
      "sockelleiste montieren",
      "tür reparieren",
      "tür schließt nicht",
      "fenster reparieren",
      "fenster schließt nicht",
      "dach reparieren",
      "dach decken",
    ],
  },
  {
    categorySlugs: ["housemaster"],
    terms: [
      // RU — handyman / mount / furniture fix / locks
      "мастер на час",
      "мастер на дом",
      "хаусмастер",
      "домашний мастер",
      "повесить полку",
      "повесить зеркало",
      "повесить телевизор",
      "повесить люстру",
      "повесить карниз",
      "ремонт мебели",
      "починить шкаф",
      "поменять замок",
      "заменить замок",
      // UK
      "майстер на годину",
      "майстер додому",
      "хаусмайстер",
      "домашній майстер",
      "повісити полицю",
      "повісити дзеркало",
      "повісити телевізор",
      "повісити люстру",
      "повісити карниз",
      "ремонт меблів",
      "полагодити шафу",
      "поміняти замок",
      "замінити замок",
      // DE
      "hausmeister",
      "haushandwerker",
      "regal aufhängen",
      "spiegel aufhängen",
      "fernseher aufhängen",
      "tv wandhalterung montieren",
      "lampe aufhängen",
      "leuchte montieren",
      "gardinenstange montieren",
      "möbel reparieren",
      "schrank reparieren",
      "schloss wechseln",
      "türgriff wechseln",
      "dachdecker",
    ],
  },
  {
    categorySlugs: ["furniture-assembly"],
    terms: [
      "собрать мебель",
      "собрать шкаф",
      "собрать комод",
      "собрать кровать",
      "сборка мебели",
      "ikea собрать",
      "ikea сборка",
      "зібрати меблі",
      "зібрати шафу",
      "зібрати комод",
      "зібрати ліжко",
      "збірка меблів",
      "möbel aufbauen",
      "möbelmontage",
      "schrank aufbauen",
      "kommode aufbauen",
      "bett aufbauen",
      "ikea aufbau",
      "ikea möbel aufbauen",
    ],
  },
  {
    // Primary slug from growth migrations; housemaster/small-repairs as prod fallbacks.
    categorySlugs: ["plumber", "housemaster", "small-repairs"],
    terms: [
      "сантехник",
      "поменять кран",
      "заменить кран",
      "кран течет",
      "кран течёт",
      "поменять смеситель",
      "заменить смеситель",
      "смеситель течет",
      "смеситель течёт",
      "поменять сифон",
      "засор",
      "забилась раковина",
      "сантехнік",
      "поміняти кран",
      "замінити кран",
      "тече кран",
      "поміняти змішувач",
      "замінити змішувач",
      "тече змішувач",
      "замінити сифон",
      "засмічення",
      "забилась раковина",
      "klempner",
      "wasserhahn wechseln",
      "wasserhahn reparieren",
      "wasserhahn tropft",
      "armatur wechseln",
      "armatur reparieren",
      "mischer wechseln",
      "siphon wechseln",
      "verstopfung",
      "waschbecken verstopft",
      "spüle verstopft",
    ],
  },
  {
    categorySlugs: ["electrician", "housemaster", "small-repairs"],
    terms: [
      "электрик",
      "електрик",
      "elektriker",
      "подключить стиральную машину",
      "подключить посудомойку",
      "підключити пральну машину",
      "підключити посудомийну машину",
      "waschmaschine anschließen",
      "spülmaschine anschließen",
    ],
  },
  {
    categorySlugs: ["gardening"],
    terms: [
      "садовые работы",
      "убрать сад",
      "подстричь газон",
      "обрезать деревья",
      "садовник",
      "садові роботи",
      "підстригти газон",
      "обрізати дерева",
      "садівник",
      "gartenarbeit",
      "rasen mähen",
      "bäume schneiden",
      "hecke schneiden",
      "gartenpflege",
    ],
  },
  {
    categorySlugs: ["cleaning"],
    terms: [
      "уборка",
      "клининг",
      "уборка квартиры",
      "прибирання",
      "клінінг",
      "прибирання квартири",
      "reinigung",
      "putzfrau",
      "wohnungsreinigung",
    ],
  },

  // ---------------------------------------------------------------------------
  // Moving & transport
  // ---------------------------------------------------------------------------
  {
    categorySlugs: ["moving-help", "apartment-moving"],
    terms: [
      "переезд",
      "помощь с переездом",
      "квартирный переезд",
      "переїзд",
      "допомога з переїздом",
      "квартирний переїзд",
      "umzug",
      "umzugshilfe",
      "wohnungsumzug",
    ],
  },
  {
    categorySlugs: ["movers"],
    terms: [
      "грузчики",
      "перевезти мебель",
      "перевозка мебели",
      "вантажники",
      "перевезти меблі",
      "перевезення меблів",
      "möbel tragen",
      "möbelpacker",
      "träger",
    ],
  },
  {
    categorySlugs: ["furniture-removal"],
    terms: [
      "вывезти мебель",
      "вынести мебель",
      "утилизация мебели",
      "винести меблі",
      "вивезення меблів",
      "entrümpelung",
      "möbelentsorgung",
      "sperrmüll",
    ],
  },
  {
    categorySlugs: ["international-moving"],
    terms: [
      "международный переезд",
      "переезд в другую страну",
      "міжнародний переїзд",
      "auslandsumzug",
      "internationaler umzug",
    ],
  },
  {
    categorySlugs: ["taxi-transfer"],
    terms: [
      "такси",
      "трансфер",
      "таксі",
      "taxi",
      "transfer",
      "flughafentransfer",
    ],
  },

  // ---------------------------------------------------------------------------
  // Tax & accounting
  // ---------------------------------------------------------------------------
  {
    categorySlugs: ["tax-consultants"],
    terms: [
      "налоговый консультант",
      "налоговая декларация",
      "налоги",
      "декларация",
      "elster",
      "finanzamt",
      "steuererklärung",
      "steuererklarung",
      "steuerberater",
      "steuerberatung",
      "gewerbe steuer",
      "selbständig steuer",
      "selbstandig steuer",
      "податковий консультант",
      "податкова декларація",
      "податки",
      "tax consultant",
      "tax return",
    ],
  },
  {
    categorySlugs: ["buchfuehrung"],
    terms: [
      "бухгалтер",
      "бухгалтерия",
      "учёт",
      "учет",
      "jahresabschluss",
      "buchhalter",
      "buchhaltung",
      "buchführung",
      "buchfuhrung",
      "accounting",
      "бухгалтерія",
      "облік",
    ],
  },

  // ---------------------------------------------------------------------------
  // Psychology & coaching
  // ---------------------------------------------------------------------------
  {
    categorySlugs: ["psychologists"],
    terms: [
      "психолог",
      "psychologe",
      "psychologist",
      "тревога",
      "панические атаки",
      "стресс",
      "депрессия",
      "отношения",
      "развод",
      "адаптация в германии",
      "адаптация в німеччині",
      "psychologische beratung",
      "angst",
      "anxiety",
      "depression",
      "therapy",
      "психолог тревога",
    ],
  },
  {
    categorySlugs: ["psychotherapists"],
    terms: [
      "психотерапевт",
      "психотерапия",
      "психотерапевт",
      "психотерапія",
      "psychotherapeut",
      "psychotherapie",
    ],
  },
  {
    categorySlugs: ["coaches"],
    terms: [
      "коуч",
      "коучинг",
      "life coach",
      "coach",
      "coaching",
      "karriere coaching",
    ],
  },

  // ---------------------------------------------------------------------------
  // Education & tutors
  // ---------------------------------------------------------------------------
  {
    categorySlugs: ["tutors"],
    terms: [
      "репетитор",
      "репетиторы",
      "репетиторство",
      "репетитор немецкий",
      "репетитор немецкого",
      "репетитор математика",
      "репетитор английский",
      "репетитор",
      "репетиторство",
      "nachhilfe",
      "nachhilfelehrer",
      "prüfungsvorbereitung",
      "exam prep",
      "школьная помощь",
    ],
  },
  {
    categorySlugs: ["language-teachers"],
    terms: [
      "немецкий язык",
      "deutsch lernen",
      "уроки немецкого",
      "англійська мова",
      "английский язык",
      "мовні курси",
      "языковые курсы",
      "sprachlehrer",
      "sprachkurs",
      "deutschkurs",
    ],
  },
  {
    categorySlugs: ["exam-prep"],
    terms: [
      "подготовка к экзамену",
      "подготовка к экзаменам",
      "экзамен",
      "підготовка до іспиту",
      "іспит",
      "abiturvorbereitung",
    ],
  },

  // ---------------------------------------------------------------------------
  // Beauty & care
  // ---------------------------------------------------------------------------
  {
    categorySlugs: ["cosmetologists"],
    terms: [
      "косметолог",
      "косметология",
      "kosmetik",
      "kosmetologe",
      "косметика",
      "уход за кожей",
      "skin care",
      "косметологія",
    ],
  },
  {
    categorySlugs: ["nails"],
    terms: [
      "маникюр",
      "педикюр",
      "манікюр",
      "maniküre",
      "pediküre",
      "nagelstudio",
    ],
  },
  {
    categorySlugs: ["hairdressers"],
    terms: [
      "парикмахер",
      "стрижка",
      "окрашивание",
      "перукар",
      "фарбування",
      "friseur",
      "haarschnitt",
      "haare färben",
    ],
  },
  {
    categorySlugs: ["brows-lashes"],
    terms: [
      "брови",
      "ресницы",
      "наращивание ресниц",
      "брови",
      "вії",
      "augenbrauen",
      "wimpern",
    ],
  },
  {
    categorySlugs: ["makeup-artists"],
    terms: [
      "визажист",
      "макияж",
      "візажист",
      "макіяж",
      "visagist",
      "make-up",
    ],
  },
  {
    categorySlugs: ["massage-therapists"],
    terms: [
      "массаж",
      "массажист",
      "массажисты",
      "масаж",
      "масажист",
      "massage",
      "masseur",
    ],
  },

  // ---------------------------------------------------------------------------
  // IT, web, computers
  // ---------------------------------------------------------------------------
  {
    categorySlugs: ["computer-repair"],
    terms: [
      "ремонт компьютера",
      "ремонт ноутбука",
      "починить ноутбук",
      "компьютер не включается",
      "ноутбук тормозит",
      "ремонт пк",
      "ремонт компʼютера",
      "ремонт комп'ютера",
      "ремонт ноутбука",
      "computer reparieren",
      "laptop langsam",
      "computerreparatur",
      "pc-reparatur",
      "laptop reparieren",
    ],
  },
  {
    categorySlugs: ["it-support"],
    terms: [
      "it",
      "it support",
      "it-поддержка",
      "it-підтримка",
      "it hilfe",
      "it-support",
      "helpdesk",
      "сайт",
      "сделать сайт",
      "создание сайта",
      "website",
      "webseite",
      "webseite erstellen",
      "лендинг",
      "landing",
      "landingpage",
      "web design",
      "вебсайт",
      "сайт под ключ",
      "wordpress",
      "seo",
      "google analytics",
      "логотип",
      "разработка логотипа",
      "дизайн логотипа",
      "logo",
      "grafikdesign",
      "интернет-магазин",
      "onlineshop",
    ],
  },
  {
    categorySlugs: ["network-setup"],
    terms: [
      "настройка ноутбука",
      "настройка компьютера",
      "windows установить",
      "установка windows",
      "налаштування ноутбука",
      "laptop einrichten",
      "computer einrichten",
      "windows installieren",
      "настройка интернета",
      "wi-fi",
      "wlan",
      "router einrichten",
      "налаштування інтернету",
    ],
  },
  {
    categorySlugs: ["printer-repair"],
    terms: [
      "принтер",
      "настройка принтера",
      "ремонт принтера",
      "оргтехника",
      "drucker",
      "drucker einrichten",
      "druckerreparatur",
      "bürotechnik",
    ],
  },

  // ---------------------------------------------------------------------------
  // Legal, migration, translation, photo
  // ---------------------------------------------------------------------------
  {
    categorySlugs: ["lawyers"],
    terms: [
      "адвокат",
      "юрист",
      "anwalt",
      "rechtsanwalt",
      "юридическая консультация",
    ],
  },
  {
    categorySlugs: ["migration-consultants"],
    terms: [
      "миграционный консультант",
      "миграция",
      "внж",
      "aufenthaltstitel",
      "migrationsberater",
      "миграційний консультант",
    ],
  },
  {
    categorySlugs: ["translator"],
    terms: [
      "переводчик",
      "перевод документов",
      "перевод",
      "перекладач",
      "переклад документів",
      "переклад",
      "übersetzer",
      "übersetzung",
      "dolmetscher",
      "beglaubigte übersetzung",
      "certified translation",
      "перевод для finanzamt",
      "перевод для визы",
      "dokumente übersetzen",
    ],
  },
  {
    // photographer from growth migrations; photo-video as confirmed sibling slug in DB seeds.
    categorySlugs: ["photographer", "photo-video"],
    terms: [
      "фотограф",
      "фотосессия",
      "фотосъёмка",
      "свадебный фотограф",
      "семейная фотосессия",
      "фотограф",
      "фотосесія",
      "весільний фотограф",
      "fotograf",
      "fotoshooting",
      "hochzeitsfotograf",
      "familienfotoshooting",
    ],
  },
];

/** Fold apostrophe variants so UK keyboard input matches dictionary terms. */
function foldApostrophes(value: string): string {
  return value.replace(/[\u02bc\u2019\u0060\u00b4']/g, "'");
}

/** Normalize user query: trim, lowercase, collapse spaces, cap length. */
export function normalizeSearchQuery(value: string | null | undefined): string | null {
  if (value == null || typeof value !== "string") return null;
  const normalized = foldApostrophes(value.trim().replace(/\s+/g, " ")).toLowerCase();
  if (!normalized) return null;
  return normalized.slice(0, MAX_SEARCH_QUERY_LENGTH);
}

/** Sanitize a token before use inside PostgREST `.or()` ilike filters. */
export function sanitizeSearchQueryToken(value: string): string {
  return sanitizeSearchToken(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isLatinShortToken(term: string): boolean {
  return term.length <= 3 && /^[a-z0-9]+$/i.test(term);
}

function termMatchesQuery(term: string, query: string): boolean {
  const t = foldApostrophes(term.toLowerCase().trim());
  if (!t || !query) return false;
  if (query === t) return true;

  if (t.length >= 3 && query.includes(t)) {
    if (isLatinShortToken(t)) {
      return new RegExp(`(?:^|\\s)${escapeRegExp(t)}(?:\\s|$)`).test(query);
    }
    return true;
  }

  if (query.length >= 4 && t.includes(query)) return true;

  return false;
}

/** Synonym groups whose terms match the normalized query. */
export function getMatchedSynonymGroups(normalizedQuery: string): readonly SynonymGroup[] {
  return SYNONYM_GROUPS.filter((group) =>
    group.terms.some((term) => termMatchesQuery(term, normalizedQuery))
  );
}

/** Expand normalized query into text-search terms (full query + matching group terms only). */
export function expandSearchTerms(normalizedQuery: string): string[] {
  const terms = new Set<string>();

  const primary = sanitizeSearchQueryToken(normalizedQuery);
  if (primary) terms.add(primary);

  for (const group of getMatchedSynonymGroups(normalizedQuery)) {
    for (const term of group.terms) {
      if (!termMatchesQuery(term, normalizedQuery)) continue;
      const safe = sanitizeSearchQueryToken(foldApostrophes(term.toLowerCase()));
      if (safe) terms.add(safe);
    }
  }

  return Array.from(terms).slice(0, MAX_SEARCH_TERMS);
}

/** Resolve category slugs implied by synonym groups for the query. */
export function resolveCategorySlugsFromQuery(normalizedQuery: string): string[] {
  const slugs = new Set<string>();
  for (const group of getMatchedSynonymGroups(normalizedQuery)) {
    for (const slug of group.categorySlugs) slugs.add(slug);
  }
  return Array.from(slugs);
}

/** Build PostgREST `.or()` filter for ilike across multiple fields and terms. */
export function buildIlikeOrFilter(
  terms: string[],
  fields: readonly string[]
): string | null {
  const parts: string[] = [];
  for (const term of terms) {
    const safe = sanitizeSearchQueryToken(term);
    if (!safe) continue;
    for (const field of fields) {
      parts.push(`${field}.ilike.%${safe}%`);
    }
  }
  return parts.length > 0 ? parts.join(",") : null;
}
