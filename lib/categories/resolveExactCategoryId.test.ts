import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveExactCategoryId } from "./resolveExactCategoryId.ts";

const COACHES = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

type Row = Record<string, unknown>;

function client(options: {
  categories?: Row[];
  terms?: Row[];
  errors?: { categories?: unknown; terms?: unknown };
}) {
  const queries: Array<{ table: string; ops: Array<{ name: string; args: unknown[] }> }> = [];
  const supabase = {
    from(table: string) {
      const ops: Array<{ name: string; args: unknown[] }> = [];
      queries.push({ table, ops });
      const chain: {
        eq: (...args: unknown[]) => typeof chain;
        then: (
          onFulfilled: (value: { data: Row[] | null; error: unknown }) => unknown,
        ) => Promise<unknown>;
      } = {
        eq(...args: unknown[]) {
          ops.push({ name: "eq", args });
          return chain;
        },
        then(onFulfilled) {
          const error =
            table === "v_searchable_categories"
              ? options.errors?.categories ?? null
              : table === "category_search_terms"
                ? options.errors?.terms ?? null
                : { message: "unexpected table" };
          if (error) return Promise.resolve(onFulfilled({ data: null, error }));
          let rows = [
            ...(table === "v_searchable_categories" ? options.categories ?? [] : options.terms ?? []),
          ];
          for (const op of ops) {
            if (op.name !== "eq") continue;
            const [column, value] = op.args;
            rows = rows.filter((row) => row[String(column)] === value);
          }
          return Promise.resolve(onFulfilled({ data: rows, error: null }));
        },
      };
      return {
        select() {
          return chain;
        },
      };
    },
  };
  return { supabase: supabase as unknown as SupabaseClient, queries };
}

test("exact title resolves one category id", async () => {
  const db = client({
    categories: [{ category_id: COACHES, title: "Коучи", title_ru: null, title_de: null, title_ua: null }],
  });
  const result = await resolveExactCategoryId(db.supabase, "Коучи");
  assert.deepEqual(result, { status: "resolved", categoryId: COACHES });
});

test("exact localized title resolves one category id", async () => {
  const db = client({
    categories: [{ category_id: COACHES, title: "Coaches", title_ru: "Коучи", title_de: "Coaches", title_ua: "Коучі" }],
  });
  const result = await resolveExactCategoryId(db.supabase, "Коучі");
  assert.deepEqual(result, { status: "resolved", categoryId: COACHES });
});

test("exact active search term resolves one category id", async () => {
  const db = client({
    categories: [{ category_id: COACHES, title: "Coaches" }],
    terms: [{ category_id: COACHES, term: "коуч", is_active: true }],
  });
  const result = await resolveExactCategoryId(db.supabase, "коуч");
  assert.deepEqual(result, { status: "resolved", categoryId: COACHES });
  assert.equal(
    db.queries.some((query) => query.ops.some((op) => op.name === "eq" && op.args[0] === "is_active" && op.args[1] === true)),
    true,
  );
});

test("case and surrounding whitespace still match exactly", async () => {
  const db = client({
    categories: [{ category_id: COACHES, title_ua: "Коучи" }],
  });
  const result = await resolveExactCategoryId(db.supabase, "  КОУЧИ  ");
  assert.deepEqual(result, { status: "resolved", categoryId: COACHES });
});

test("prefix does not match", async () => {
  const db = client({
    categories: [{ category_id: COACHES, title: "Коучи" }],
  });
  const result = await resolveExactCategoryId(db.supabase, "Коуч");
  assert.deepEqual(result, { status: "unresolved" });
});

test("substring does not match", async () => {
  const db = client({
    categories: [{ category_id: COACHES, title: "Коучи" }],
    terms: [{ category_id: COACHES, term: "онлайн-коуч", is_active: true }],
  });
  const result = await resolveExactCategoryId(db.supabase, "коуч");
  assert.deepEqual(result, { status: "unresolved" });
});

test("zero results stay unresolved", async () => {
  const db = client({
    categories: [{ category_id: COACHES, title: "Сантехники" }],
  });
  const result = await resolveExactCategoryId(db.supabase, "Коучи");
  assert.deepEqual(result, { status: "unresolved" });
});

test("duplicate aliases of one category still resolve that single id", async () => {
  const db = client({
    categories: [{ category_id: COACHES, title: "Коучи", title_ua: "Коучи" }],
    terms: [{ category_id: COACHES, term: "коучи", is_active: true }],
  });
  const result = await resolveExactCategoryId(db.supabase, "Коучи");
  assert.deepEqual(result, { status: "resolved", categoryId: COACHES });
});

test("the same exact term on two categories is ambiguous", async () => {
  const db = client({
    categories: [
      { category_id: COACHES, title: "Коучи" },
      { category_id: OTHER, title: "Other" },
    ],
    terms: [
      { category_id: COACHES, term: "coach", is_active: true },
      { category_id: OTHER, term: "Coach", is_active: true },
    ],
  });
  const result = await resolveExactCategoryId(db.supabase, "coach");
  assert.deepEqual(result, { status: "unresolved" });
});

test("inactive terms and categories outside the searchable set are ignored", async () => {
  const inactive = "33333333-3333-4333-8333-333333333333";
  const db = client({
    categories: [{ category_id: COACHES, title: "Сантехники" }],
    terms: [
      { category_id: COACHES, term: "Коучи", is_active: false },
      { category_id: inactive, term: "Коучи", is_active: true },
    ],
  });
  const result = await resolveExactCategoryId(db.supabase, "Коучи");
  assert.deepEqual(result, { status: "unresolved" });
});

test("a catalogue read failure is not an unresolved category", async () => {
  const db = client({
    categories: [{ category_id: COACHES, title: "Коучи" }],
    errors: { categories: { message: "boom" } },
  });
  const result = await resolveExactCategoryId(db.supabase, "Коучи");
  assert.deepEqual(result, { status: "error" });
  assert.notEqual(result.status, "unresolved");
});
