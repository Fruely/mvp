import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { PAID_REQUEST_ACCESS_CAPABILITY } from "../nativeInstallations/capabilities.ts";
import { legacyFreeConnectionBlocked } from "./legacyClaimGate.ts";

const REQUEST = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const SPEC = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER = "88888888-8888-4888-8888-888888888888";

type Row = Record<string, unknown>;

function memory(seed: Record<string, Row[]>) {
  const tables: Record<string, Row[]> = {};
  for (const [name, rows] of Object.entries(seed)) tables[name] = rows.map((row) => ({ ...row }));
  return {
    from(table: string) {
      const filters: Array<(row: Row) => boolean> = [];
      const rows = () => (tables[table] ??= []);
      const matched = () => rows().filter((row) => filters.every((filter) => filter(row)));
      const api = {
        select() { return api; },
        eq(column: string, value: unknown) {
          filters.push((row) => row[column] === value);
          return api;
        },
        in(column: string, values: unknown[]) {
          filters.push((row) => values.includes(row[column]));
          return api;
        },
        maybeSingle: async () => ({ data: matched()[0] ? { ...matched()[0] } : null, error: null }),
        then(resolve: (value: { data: Row[]; error: null }) => unknown) {
          return Promise.resolve({ data: matched().map((row) => ({ ...row })), error: null as null }).then(resolve);
        },
      };
      return api;
    },
  };
}

test("a paid-capable specialist cannot take the free connection", async () => {
  const capable = memory({
    specialists: [{ id: SPEC, user_id: USER }],
    native_installations: [{ user_id: USER, active: true, capabilities: [PAID_REQUEST_ACCESS_CAPABILITY] }],
    request_offers: [],
  });
  assert.equal(await legacyFreeConnectionBlocked(capable as unknown as SupabaseClient, {
    serviceRequestId: REQUEST,
    specialistId: SPEC,
  }), true);
});

test("an inactive installation does not make a specialist paid-capable", async () => {
  const inactive = memory({
    specialists: [{ id: SPEC, user_id: USER }],
    native_installations: [{ user_id: USER, active: false, capabilities: [PAID_REQUEST_ACCESS_CAPABILITY] }],
    request_offers: [],
  });
  assert.equal(await legacyFreeConnectionBlocked(inactive as unknown as SupabaseClient, {
    serviceRequestId: REQUEST,
    specialistId: SPEC,
  }), false);
});

test("legacy traffic without the paid capability stays open", async () => {
  const legacy = memory({
    specialists: [{ id: SPEC, user_id: USER }],
    native_installations: [{ user_id: USER, active: true, capabilities: [] }],
    request_offers: [],
  });
  assert.equal(await legacyFreeConnectionBlocked(legacy as unknown as SupabaseClient, {
    serviceRequestId: REQUEST,
    specialistId: SPEC,
  }), false);
});

test("a capability lookup failure is closed", async () => {
  const broken = {
    from(table: string) {
      const api = {
        select() { return api; },
        eq() { return api; },
        in() { return api; },
        maybeSingle: async () => table === "specialists"
          ? { data: { user_id: USER }, error: null }
          : { data: null, error: { message: "missing" } },
        then(resolve: (value: { data: null; error: { message: string } }) => unknown) {
          return Promise.resolve({ data: null, error: { message: "missing" } }).then(resolve);
        },
      };
      return api;
    },
  };
  assert.equal(await legacyFreeConnectionBlocked(broken as unknown as SupabaseClient, {
    serviceRequestId: REQUEST,
    specialistId: SPEC,
  }), true);
});
