import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { deliverPendingOutbox } from "./delivery.ts";

test("due outbox rows are selected by next attempt and then creation time", async () => {
  const orders: string[] = [];
  const api = {
    select() {
      return api;
    },
    in() {
      return api;
    },
    lte() {
      return api;
    },
    order(column: string) {
      orders.push(column);
      return api;
    },
    limit: async () => ({ data: [], error: null }),
  };
  const supabase = {
    from() {
      return api;
    },
  } as unknown as SupabaseClient;
  const result = await deliverPendingOutbox(supabase);
  assert.deepEqual(orders, ["next_attempt_at", "created_at"]);
  assert.equal(result.processed, 0);
});
