import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";
import { normalizeSearchLangToDbCode } from "@/lib/i18n/normalizeSearchLangToDbCode";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 50;

/**
 * Ranking tiers (higher = better). Term matches always beat title matches at the same match shape.
 * Within terms, lang === queryLang gets +TERM_LANG_MATCH_BONUS over lang IS NULL (same tier).
 *
 * score = max(best term row score, best title score per category)
 *
 * Tie-breakers after score: specialists_count desc, then slug asc.
 */
const TERM_EXACT = 600;
const TERM_PREFIX = 500;
const TERM_SUBSTRING = 400;
const TITLE_EXACT = 300;
const TITLE_PREFIX = 200;
const TITLE_SUBSTRING = 100;
const TERM_LANG_MATCH_BONUS = 20;

type SearchableCategoryRow = {
  category_id: string;
  slug: string | null;
  title: string | null;
  title_ru: string | null;
  title_de: string | null;
  title_ua: string | null;
  specialists_count: number | string | null;
};

type TermRow = {
  category_id: string;
  term: string;
  lang: string | null;
};

/** Strip characters that break PostgREST `or()` / ILIKE patterns or widen matches unintentionally. */
function sanitizeForIlike(value: string): string {
  return value.trim().replace(/[%_\\,]/g, "");
}

function parseLimit(raw: string | null): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, n);
}

function titleOrClauseForLang(langCode: string | null, pattern: string): string {
  if (langCode === "ru") {
    return `title_ru.ilike.${pattern},title.ilike.${pattern}`;
  }
  if (langCode === "de") {
    return `title_de.ilike.${pattern},title.ilike.${pattern}`;
  }
  if (langCode === "uk") {
    return `title_ua.ilike.${pattern},title.ilike.${pattern}`;
  }
  return `title.ilike.${pattern},title_ru.ilike.${pattern},title_de.ilike.${pattern},title_ua.ilike.${pattern}`;
}

function termTierScore(term: string, query: string): number {
  const t = term.trim().toLowerCase();
  const q = query.toLowerCase();
  if (!q) return 0;
  if (t === q) return TERM_EXACT;
  if (t.startsWith(q)) return TERM_PREFIX;
  if (t.includes(q)) return TERM_SUBSTRING;
  return 0;
}

function termRowScore(term: string, termLang: string | null, queryLang: string | null, query: string): number {
  const tier = termTierScore(term, query);
  if (tier === 0) return 0;
  const langBonus =
    queryLang && termLang === queryLang ? TERM_LANG_MATCH_BONUS : 0;
  return tier + langBonus;
}

function titleStringsForLang(row: SearchableCategoryRow, langCode: string | null): string[] {
  const add = (s: string | null | undefined, out: string[]) => {
    const v = typeof s === "string" && s.trim() ? s : null;
    if (v) out.push(v);
  };
  const out: string[] = [];
  if (langCode === "ru") {
    add(row.title_ru, out);
    add(row.title, out);
  } else if (langCode === "de") {
    add(row.title_de, out);
    add(row.title, out);
  } else if (langCode === "uk") {
    add(row.title_ua, out);
    add(row.title, out);
  } else {
    add(row.title, out);
    add(row.title_ru, out);
    add(row.title_de, out);
    add(row.title_ua, out);
  }
  return out;
}

function bestTitleScore(strings: string[], query: string): number {
  const q = query.toLowerCase();
  if (!q) return 0;
  let best = 0;
  for (const s of strings) {
    const t = s.trim().toLowerCase();
    if (t === q) best = Math.max(best, TITLE_EXACT);
    else if (t.startsWith(q)) best = Math.max(best, TITLE_PREFIX);
    else if (t.includes(q)) best = Math.max(best, TITLE_SUBSTRING);
  }
  return best;
}

function mapCategoryRow(row: SearchableCategoryRow) {
  return {
    id: row.category_id,
    slug: row.slug ?? "",
    title: row.title ?? "",
    title_ru: row.title_ru ?? "",
    title_de: row.title_de ?? "",
    title_ua: row.title_ua ?? "",
    specialists_count: Number(row.specialists_count ?? 0),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const qRaw = searchParams.get("q");
    const langCode = normalizeSearchLangToDbCode(searchParams.get("lang"));
    const limit = parseLimit(searchParams.get("limit"));

    const safeQuery = typeof qRaw === "string" ? sanitizeForIlike(qRaw) : "";
    const supabase = createSupabaseServerClient();

    if (!safeQuery) {
      const { data: topRows, error: topError } = await supabase
        .from("v_searchable_categories")
        .select("category_id, slug, title, title_ru, title_de, title_ua, specialists_count")
        .order("specialists_count", { ascending: false })
        .order("slug", { ascending: true })
        .limit(limit);

      if (topError) {
        console.error("[categories/suggest] v_searchable_categories top", topError);
        return jsonNoStore({ error: "Failed to load suggestions" }, { status: 500 });
      }

      const data = (topRows ?? []).map((row) =>
        mapCategoryRow(row as SearchableCategoryRow)
      );
      return jsonNoStore({ data });
    }

    const pattern = `%${safeQuery}%`;

    let termQuery = supabase
      .from("category_search_terms")
      .select("category_id, term, lang")
      .eq("is_active", true)
      .ilike("term", pattern);

    if (langCode) {
      termQuery = termQuery.or(`lang.is.null,lang.eq.${langCode}`);
    }

    const titleQuery = supabase
      .from("v_searchable_categories")
      .select("category_id")
      .or(titleOrClauseForLang(langCode, pattern));

    const [{ data: termRows, error: termError }, { data: titleRows, error: titleError }] =
      await Promise.all([termQuery, titleQuery]);

    if (termError) {
      console.error("[categories/suggest] category_search_terms", termError);
      return jsonNoStore({ error: "Failed to load suggestions" }, { status: 500 });
    }
    if (titleError) {
      console.error("[categories/suggest] v_searchable_categories ids", titleError);
      return jsonNoStore({ error: "Failed to load suggestions" }, { status: 500 });
    }

    const ids = new Set<string>();
    for (const row of termRows ?? []) {
      const id = (row as TermRow).category_id;
      if (typeof id === "string" && id) ids.add(id);
    }
    for (const row of titleRows ?? []) {
      const id = (row as { category_id?: string }).category_id;
      if (typeof id === "string" && id) ids.add(id);
    }

    if (ids.size === 0) {
      return jsonNoStore({ data: [] });
    }

    const { data: fullRows, error: fullError } = await supabase
      .from("v_searchable_categories")
      .select("category_id, slug, title, title_ru, title_de, title_ua, specialists_count")
      .in("category_id", Array.from(ids));

    if (fullError) {
      console.error("[categories/suggest] v_searchable_categories full", fullError);
      return jsonNoStore({ error: "Failed to load suggestions" }, { status: 500 });
    }

    const categories = (fullRows ?? []) as SearchableCategoryRow[];

    const termsByCategory = new Map<string, TermRow[]>();
    for (const row of termRows ?? []) {
      const tr = row as TermRow;
      if (typeof tr.category_id !== "string" || !tr.category_id) continue;
      const list = termsByCategory.get(tr.category_id) ?? [];
      list.push(tr);
      termsByCategory.set(tr.category_id, list);
    }

    const scored = categories.map((row) => {
      let bestTerm = 0;
      for (const tr of termsByCategory.get(row.category_id) ?? []) {
        bestTerm = Math.max(
          bestTerm,
          termRowScore(tr.term, tr.lang, langCode, safeQuery)
        );
      }
      const titleScore = bestTitleScore(titleStringsForLang(row, langCode), safeQuery);
      const score = Math.max(bestTerm, titleScore);
      return { row, score };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ac = Number(a.row.specialists_count ?? 0);
      const bc = Number(b.row.specialists_count ?? 0);
      if (bc !== ac) return bc - ac;
      return String(a.row.slug ?? "").localeCompare(String(b.row.slug ?? ""));
    });

    const data = scored.slice(0, limit).map(({ row }) => mapCategoryRow(row));

    return jsonNoStore({ data });
  } catch (e: unknown) {
    console.error("[categories/suggest]", e);
    return jsonNoStore({ error: "Failed to load suggestions" }, { status: 500 });
  }
}
