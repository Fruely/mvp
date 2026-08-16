import assert from "node:assert/strict";
import test from "node:test";

import { applyClientUserIdempotencyFilter } from "./idempotencyOwnerScope.ts";

test("applyClientUserIdempotencyFilter scopes owned rows", () => {
  const calls: Array<[string, unknown]> = [];
  const query = {
    eq(column: string, value: string) {
      calls.push(["eq", `${column}=${value}`]);
      return this;
    },
    is(column: string, value: null) {
      calls.push(["is", `${column}=${String(value)}`]);
      return this;
    },
  };

  applyClientUserIdempotencyFilter(query, "user-123");
  assert.deepEqual(calls, [["eq", "client_user_id=user-123"]]);
});

test("applyClientUserIdempotencyFilter scopes anonymous rows", () => {
  const calls: Array<[string, unknown]> = [];
  const query = {
    eq(column: string, value: string) {
      calls.push(["eq", `${column}=${value}`]);
      return this;
    },
    is(column: string, value: null) {
      calls.push(["is", `${column}=${String(value)}`]);
      return this;
    },
  };

  applyClientUserIdempotencyFilter(query, null);
  assert.deepEqual(calls, [["is", "client_user_id=null"]]);
});
