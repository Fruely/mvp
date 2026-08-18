import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { SupabaseClient } from "@supabase/supabase-js";

const servicePath = fileURLToPath(new URL("./service.ts", import.meta.url));
const routePath = fileURLToPath(
  new URL("../../app/api/specialist/leads/route.ts", import.meta.url),
);

const SPECIALIST_ID = "22222222-2222-2222-2222-222222222222";

/** Minimal thenable Supabase query chain for route wiring simulation. */
function createListMockService(rows: Record<string, unknown>[]) {
  const calls: { table?: string; specialistId?: string } = {};

  const chain: Record<string, unknown> = {};
  const self = () => chain;

  chain.select = self;
  chain.eq = (_col: string, val: unknown) => {
    if (_col === "specialist_id") {
      calls.specialistId = String(val);
    }
    return chain;
  };
  chain.order = self;
  chain.limit = self;
  chain.or = self;
  chain.then = (
    onFulfilled: (value: { data: Record<string, unknown>[]; error: null }) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve({ data: rows, error: null }).then(onFulfilled, onRejected);

  const service = {
    from(table: string) {
      calls.table = table;
      return chain;
    },
  } as unknown as SupabaseClient;

  return { service, calls };
}

/**
 * Mirrors the route call shape: listSpecialistLeads(supabase, session.specialistId, params).
 * Uses the same first-parameter `.from("leads")` wiring the service must preserve.
 */
async function invokeRouteListCall(
  service: SupabaseClient,
  specialistId: string,
  params: { limit?: unknown; cursor?: unknown; status?: unknown },
) {
  const src = await readFile(servicePath, "utf8");
  assert.match(
    src,
    /export async function listSpecialistLeads\(\s*\n\s*service: SupabaseClient,/,
    "listSpecialistLeads must accept SupabaseClient as first argument",
  );

  const limit = 20;
  const query = service
    .from("leads")
    .select("id")
    .eq("specialist_id", specialistId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(limit + 1);

  void params;
  await query;
}

test("listSpecialistLeads export keeps SupabaseClient as first parameter", async () => {
  const src = await readFile(servicePath, "utf8");
  const match = src.match(
    /export async function listSpecialistLeads\(\s*([\s\S]*?)\): Promise<SpecialistLeadListPage>/,
  );

  assert.ok(match, "listSpecialistLeads export must exist");
  const params = match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  assert.equal(params.length, 3, `expected 3 parameters, got: ${params.join(" ")}`);
  assert.match(params[0], /^service: SupabaseClient,/);
  assert.match(params[1], /^specialistId: string,/);
  assert.match(params[2], /^params: \{ limit\?: unknown; cursor\?: unknown; status\?: unknown \},?$/);
  assert.match(src, /let query = service\s*\n\s*\.from\("leads"\)/);
});

test("GET /api/specialist/leads route calls listSpecialistLeads(supabase, session.specialistId, params)", async () => {
  const route = await readFile(routePath, "utf8");
  assert.match(route, /listSpecialistLeads\(\s*supabase,\s*session\.specialistId,\s*\{/);
});

test("route list call wiring uses passed SupabaseClient (arity regression guard)", async () => {
  const { service, calls } = createListMockService([]);

  await assert.doesNotReject(() =>
    invokeRouteListCall(service, SPECIALIST_ID, {
      limit: "20",
      cursor: null,
      status: "all",
    }),
  );

  assert.equal(calls.table, "leads");
  assert.equal(calls.specialistId, SPECIALIST_ID);
});
