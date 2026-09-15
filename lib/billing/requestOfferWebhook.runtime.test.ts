import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { processStripeWebhookEventForRequestOffers } from "./processRequestOfferWebhook";

type Row = Record<string, any>;

type Tables = {
  request_offer_payments: Row[];
  request_offer_access_grants: Row[];
  request_offers: Row[];
};

class QueryBuilder {
  private readonly filters: Array<[string, unknown]> = [];
  private updatePatch: Row | null = null;
  private selected = false;

  constructor(
    private readonly tables: Tables,
    private readonly table: keyof Tables,
  ) {}

  select(_columns: string) {
    this.selected = true;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }

  is(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }

  update(patch: Row) {
    this.updatePatch = patch;
    return this;
  }

  insert(row: Row) {
    this.tables[this.table].push({ id: `row_${this.tables[this.table].length + 1}`, ...row });
    return { error: null };
  }

  async maybeSingle() {
    const rows = this.tables[this.table];
    const row = rows.find((candidate) =>
      this.filters.every(([column, value]) => candidate[column] === value),
    );

    if (!row) return { data: null, error: null };
    if (this.updatePatch) Object.assign(row, this.updatePatch);
    return { data: { ...row }, error: null };
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    const promise = (async () => {
      const rows = this.tables[this.table];
      const matches = rows.filter((candidate) =>
        this.filters.every(([column, value]) => candidate[column] === value),
      );
      if (this.updatePatch) {
        for (const row of matches) Object.assign(row, this.updatePatch);
      }
      return { data: this.selected ? matches.map((row) => ({ ...row })) : null, error: null };
    })();
    return promise.then(onfulfilled, onrejected);
  }
}

function createFakeSupabase(tables: Tables): SupabaseClient {
  return {
    from(table: keyof Tables) {
      return new QueryBuilder(tables, table);
    },
  } as unknown as SupabaseClient;
}

test("paid request-offer checkout runtime path marks payment paid, grants access and marks offer paid", async () => {
  const tables: Tables = {
    request_offer_payments: [
      {
        id: "pay_1",
        offer_id: "offer_1",
        specialist_id: "specialist_1",
        amount_cents: 2500,
        currency: "EUR",
        status: "pending",
        stripe_checkout_session_id: "cs_test_1",
        stripe_payment_intent_id: null,
        stripe_charge_id: null,
      },
    ],
    request_offer_access_grants: [],
    request_offers: [
      {
        id: "offer_1",
        specialist_id: "specialist_1",
        status: "offered",
        paid_at: null,
      },
    ],
  };

  const event = {
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_1",
        metadata: {
          purpose: "request_offer_access",
          payment_id: "pay_1",
        },
        payment_status: "paid",
        amount_total: 2500,
        currency: "eur",
        payment_intent: "pi_test_1",
        created: 1_789_497_600,
      },
    },
  } as unknown as Stripe.Event;

  const result = await processStripeWebhookEventForRequestOffers(
    createFakeSupabase(tables),
    event,
  );

  assert.deepEqual(result, { outcome: "success" });
  assert.equal(tables.request_offer_payments[0].status, "paid");
  assert.equal(tables.request_offer_payments[0].stripe_payment_intent_id, "pi_test_1");
  assert.ok(tables.request_offer_payments[0].paid_at);

  assert.equal(tables.request_offer_access_grants.length, 1);
  const grant = tables.request_offer_access_grants[0];
  assert.equal(grant.offer_id, "offer_1");
  assert.equal(grant.specialist_id, "specialist_1");
  assert.equal(grant.source_payment_id, "pay_1");
  assert.equal(grant.revoked_at, undefined);

  assert.equal(tables.request_offers[0].status, "paid");
  assert.ok(tables.request_offers[0].paid_at);
});

test("unpaid checkout session never creates an access grant", async () => {
  const tables: Tables = {
    request_offer_payments: [
      {
        id: "pay_2",
        offer_id: "offer_2",
        specialist_id: "specialist_2",
        amount_cents: 2500,
        currency: "EUR",
        status: "pending",
        stripe_checkout_session_id: "cs_test_2",
        stripe_payment_intent_id: null,
        stripe_charge_id: null,
      },
    ],
    request_offer_access_grants: [],
    request_offers: [
      {
        id: "offer_2",
        specialist_id: "specialist_2",
        status: "offered",
        paid_at: null,
      },
    ],
  };

  const event = {
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_2",
        metadata: {
          purpose: "request_offer_access",
          payment_id: "pay_2",
        },
        payment_status: "unpaid",
        amount_total: 2500,
        currency: "eur",
        payment_intent: "pi_test_2",
        created: 1_789_497_600,
      },
    },
  } as unknown as Stripe.Event;

  const result = await processStripeWebhookEventForRequestOffers(
    createFakeSupabase(tables),
    event,
  );

  assert.deepEqual(result, { outcome: "pending" });
  assert.equal(tables.request_offer_payments[0].status, "pending");
  assert.equal(tables.request_offer_access_grants.length, 0);
  assert.equal(tables.request_offers[0].status, "offered");
});
