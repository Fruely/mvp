/**
 * Minimal Supabase query-builder stand-in for the category suggestion tests.
 * It records the chained operations so a test can assert which query ran, and
 * resolves through a handler the test supplies.
 */

export const categoryHarness = {
  /** Rows returned for `v_searchable_categories`. */
  categories: [],
  /** Rows returned for `category_search_terms`. */
  terms: [],
  /** Per-table error injection: { v_searchable_categories: {...}, category_search_terms: {...} }. */
  errors: {},
  /** Recorded queries: { table, select, ops: [...] }. */
  queries: [],
  /** Set to make `from()` throw, exercising the route's catch branch. */
  throwOnFrom: false,
};

export function resetCategoryHarness() {
  categoryHarness.categories = [];
  categoryHarness.terms = [];
  categoryHarness.errors = {};
  categoryHarness.queries = [];
  categoryHarness.throwOnFrom = false;
}

function matchesIlike(value, pattern) {
  if (typeof value !== "string") return false;
  const needle = pattern.replace(/^%|%$/g, "").toLowerCase();
  return value.toLowerCase().includes(needle);
}

function resolveQuery(record) {
  const { table, ops, select } = record;

  if (table === "category_search_terms") {
    const error = categoryHarness.errors.category_search_terms ?? null;
    if (error) return { data: null, error };
    const ilike = ops.find((op) => op.name === "ilike");
    const orOp = ops.find((op) => op.name === "or");
    const langMatch = orOp ? /lang\.eq\.([a-z-]+)/.exec(orOp.args[0]) : null;
    const lang = langMatch ? langMatch[1] : null;
    const rows = categoryHarness.terms.filter((row) => {
      if (row.is_active === false) return false;
      if (ilike && !matchesIlike(row.term, ilike.args[1])) return false;
      if (lang && row.lang !== null && row.lang !== lang) return false;
      return true;
    });
    return {
      data: rows.map((row) => ({
        category_id: row.category_id,
        term: row.term,
        lang: row.lang ?? null,
      })),
      error: null,
    };
  }

  if (table === "v_searchable_categories") {
    const idsOnly = select === "category_id";
    const stage = idsOnly ? "ids" : ops.some((op) => op.name === "in") ? "full" : "top";
    const error =
      categoryHarness.errors[`v_searchable_categories:${stage}`] ??
      categoryHarness.errors.v_searchable_categories ??
      null;
    if (error) return { data: null, error };

    let rows = [...categoryHarness.categories];

    const inOp = ops.find((op) => op.name === "in");
    if (inOp) {
      const allowed = new Set(inOp.args[1]);
      rows = rows.filter((row) => allowed.has(row.category_id));
    }

    const orOp = ops.find((op) => op.name === "or");
    if (orOp) {
      const clauses = orOp.args[0].split(",").map((clause) => {
        const [column, , pattern] = clause.split(".");
        return { column, pattern };
      });
      rows = rows.filter((row) =>
        clauses.some(({ column, pattern }) => matchesIlike(row[column], pattern)),
      );
    }

    // PostgREST treats successive `order` calls as one compound sort, the first
    // call being the primary key of the ordering.
    const orderOps = ops.filter((op) => op.name === "order");
    if (orderOps.length > 0) {
      rows.sort((a, b) => {
        for (const op of orderOps) {
          const [column, options] = op.args;
          const ascending = options?.ascending !== false;
          const av = a[column] ?? 0;
          const bv = b[column] ?? 0;
          const cmp =
            typeof av === "number" && typeof bv === "number"
              ? av - bv
              : String(av).localeCompare(String(bv));
          if (cmp !== 0) return ascending ? cmp : -cmp;
        }
        return 0;
      });
    }

    const limitOp = ops.find((op) => op.name === "limit");
    if (limitOp) rows = rows.slice(0, limitOp.args[0]);

    if (idsOnly) {
      return { data: rows.map((row) => ({ category_id: row.category_id })), error: null };
    }
    return { data: rows, error: null };
  }

  throw new Error(`unexpected table ${table}`);
}

function builder(record) {
  const chain = {};
  for (const name of ["eq", "ilike", "or", "in", "order", "limit", "not", "neq"]) {
    chain[name] = (...args) => {
      record.ops.push({ name, args });
      return chain;
    };
  }
  chain.then = (onFulfilled, onRejected) => {
    let result;
    try {
      result = resolveQuery(record);
    } catch (error) {
      return Promise.reject(error).then(onFulfilled, onRejected);
    }
    return Promise.resolve(result).then(onFulfilled, onRejected);
  };
  return chain;
}

export function createCategorySupabaseMock() {
  return {
    from(table) {
      if (categoryHarness.throwOnFrom) {
        throw new Error("supabase unavailable");
      }
      return {
        select(columns) {
          const record = { table, select: columns, ops: [] };
          categoryHarness.queries.push(record);
          return builder(record);
        },
      };
    },
  };
}

export function createSupabaseServerClient() {
  return createCategorySupabaseMock();
}
