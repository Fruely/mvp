import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publishPreparedPaidSpecialist } from "@/lib/billing/planPaymentFulfillment";

test("paid activation publication succeeds when prepared draft publishes", async () => {
  let called = 0;
  const ok = await publishPreparedPaidSpecialist(
    {} as SupabaseClient,
    "specialist-1",
    async (_supabase, specialistId) => {
      called += 1;
      assert.equal(specialistId, "specialist-1");
      return { ok: true, status: "published_unverified" };
    },
  );

  assert.equal(ok, true);
  assert.equal(called, 1);
});

test("paid activation publication reports failure so Stripe webhook can retry", async () => {
  const ok = await publishPreparedPaidSpecialist(
    {} as SupabaseClient,
    "specialist-2",
    async () => ({
      ok: false,
      status: 500,
      body: { error: "temporary_publication_failure" },
    }),
  );

  assert.equal(ok, false);
});

test("paid activation publication reports thrown failure so Stripe webhook can retry", async () => {
  const ok = await publishPreparedPaidSpecialist(
    {} as SupabaseClient,
    "specialist-3",
    async () => {
      throw new Error("temporary failure");
    },
  );

  assert.equal(ok, false);
});

test("paid activation cannot be acknowledged without specialist id", async () => {
  const ok = await publishPreparedPaidSpecialist({} as SupabaseClient, null, async () => ({
    ok: true,
    status: "published_unverified",
  }));

  assert.equal(ok, false);
});
