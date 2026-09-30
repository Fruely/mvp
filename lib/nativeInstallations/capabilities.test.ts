import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  activeUserIdsWithNativeCapability,
  normalizeRegistrationCapabilities,
  PAID_REQUEST_ACCESS_CAPABILITY,
  PAID_REQUEST_STORE_PURCHASE_CAPABILITY,
} from "./capabilities.ts";

test("normalization keeps only the known capability", () => {
  assert.deepEqual(normalizeRegistrationCapabilities({}), []);
  assert.deepEqual(normalizeRegistrationCapabilities({ capabilities: [] }), []);
  assert.deepEqual(
    normalizeRegistrationCapabilities({
      capabilities: [PAID_REQUEST_ACCESS_CAPABILITY, PAID_REQUEST_ACCESS_CAPABILITY, "other"],
    }),
    [PAID_REQUEST_ACCESS_CAPABILITY],
  );
  assert.equal(normalizeRegistrationCapabilities({ capabilities: "paid_request_access_v1" }), "invalid");
  assert.equal(normalizeRegistrationCapabilities({ capabilities: [1] }), "invalid");
  assert.deepEqual(
    normalizeRegistrationCapabilities({
      capabilities: [
        PAID_REQUEST_ACCESS_CAPABILITY,
        PAID_REQUEST_STORE_PURCHASE_CAPABILITY,
        "storekit",
      ],
    }),
    [PAID_REQUEST_ACCESS_CAPABILITY, PAID_REQUEST_STORE_PURCHASE_CAPABILITY],
  );
  assert.notEqual(PAID_REQUEST_ACCESS_CAPABILITY, PAID_REQUEST_STORE_PURCHASE_CAPABILITY);
});

type Installation = { user_id: string; active: boolean; capabilities: string[] };

function lookupDb(rows: Installation[]) {
  const supabase = {
    from() {
      const filters: Array<(row: Installation) => boolean> = [];
      const api = {
        select() {
          return api;
        },
        eq(column: keyof Installation, value: unknown) {
          filters.push((row) => row[column] === value);
          return api;
        },
        in(column: keyof Installation, values: unknown[]) {
          filters.push((row) => values.includes(row[column]));
          return api;
        },
        then(resolve: (value: { data: Installation[]; error: null }) => void) {
          resolve({ data: rows.filter((row) => filters.every((filter) => filter(row))), error: null });
        },
      };
      return api;
    },
  };
  return supabase as unknown as SupabaseClient;
}

test("only an active installation of the requested user counts", async () => {
  const db = lookupDb([
    { user_id: "user-a", active: false, capabilities: [PAID_REQUEST_ACCESS_CAPABILITY] },
    { user_id: "user-b", active: true, capabilities: [PAID_REQUEST_ACCESS_CAPABILITY] },
    { user_id: "user-c", active: true, capabilities: [] },
    { user_id: "user-c", active: true, capabilities: [PAID_REQUEST_ACCESS_CAPABILITY] },
  ]);
  const requested = await activeUserIdsWithNativeCapability(db, ["user-a", "user-c"]);
  assert.equal("error" in requested, false);
  if ("error" in requested) return;
  assert.equal(requested.has("user-a"), false);
  assert.equal(requested.has("user-b"), false);
  assert.equal(requested.has("user-c"), true);

  const other = await activeUserIdsWithNativeCapability(db, ["user-b"]);
  assert.equal("error" in other, false);
  if ("error" in other) return;
  assert.equal(other.has("user-b"), true);
  assert.equal(other.has("user-c"), false);
});
