import { intentHarness } from "./intentRoute.harness.mjs";

/**
 * Supabase stand-in that records every table the endpoint touches and refuses
 * any write. The endpoint must only ever read category data.
 */

const WRITE_METHODS = ["insert", "update", "upsert", "delete"];

function reader(table) {
  const chain = {};
  for (const name of ["eq", "ilike", "or", "in", "order", "limit"]) {
    chain[name] = () => chain;
  }
  chain.then = (onFulfilled, onRejected) => {
    const rows =
      table === "v_searchable_categories"
        ? intentHarness.categoryRows.map((row) => ({
            category_id: row.category_id,
            slug: row.slug ?? "",
            title: row.title ?? "",
            title_ru: row.title_ru ?? null,
            title_de: row.title_de ?? null,
            title_ua: row.title_ua ?? null,
            specialists_count: row.specialists_count ?? 0,
          }))
        : [];
    return Promise.resolve({ data: rows, error: null }).then(onFulfilled, onRejected);
  };
  return chain;
}

export function createSupabaseServerClient() {
  return {
    from(table) {
      intentHarness.supabaseTables.push(table);
      const api = {
        select: () => reader(table),
      };
      for (const method of WRITE_METHODS) {
        api[method] = () => {
          intentHarness.supabaseWrites.push({ table, method });
          throw new Error(`unexpected ${method} on ${table}`);
        };
      }
      return api;
    },
    rpc(name) {
      intentHarness.supabaseWrites.push({ table: `rpc:${name}`, method: "rpc" });
      throw new Error(`unexpected rpc ${name}`);
    },
  };
}
