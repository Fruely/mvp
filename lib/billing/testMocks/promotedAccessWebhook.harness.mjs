export const webhookHarness = {
  specialists: [],
  signupBindings: [],
  promotions: [],
  payments: [],
  accessGrants: [],
  subscriptionCredits: [],
  billingCustomers: [],
  billingEvents: [],
  billingSubscriptions: [],
  specialistPlans: [],
  partnerCommissions: [],
  paymentUpdateError: null,
  grantInsertError: null,
  creditUpdateError: null,
  stripeCouponShouldFail: false,
  billingSubscriptionInsertError: null,
  billingSubscriptionUpdateError: null,
  specialistPlanInsertError: null,
  specialistPlanUpdateError: null,
  paymentIntentById: new Map(),
  subscriptionById: new Map(),
  stripeRetrieveShouldFail: false,
  stripeSubscriptionRetrieveShouldFail: false,
  nextGrantInsertFailsOnce: false,
  nextCreditInsertFailsOnce: false,
};

export function resetWebhookHarness() {
  webhookHarness.specialists = [];
  webhookHarness.signupBindings = [];
  webhookHarness.promotions = [];
  webhookHarness.payments = [];
  webhookHarness.accessGrants = [];
  webhookHarness.subscriptionCredits = [];
  webhookHarness.billingCustomers = [];
  webhookHarness.billingEvents = [];
  webhookHarness.billingSubscriptions = [];
  webhookHarness.specialistPlans = [];
  webhookHarness.partnerCommissions = [];
  webhookHarness.paymentUpdateError = null;
  webhookHarness.grantInsertError = null;
  webhookHarness.creditInsertError = null;
  webhookHarness.creditUpdateError = null;
  webhookHarness.stripeCouponShouldFail = false;
  webhookHarness.billingSubscriptionInsertError = null;
  webhookHarness.billingSubscriptionUpdateError = null;
  webhookHarness.specialistPlanInsertError = null;
  webhookHarness.specialistPlanUpdateError = null;
  webhookHarness.paymentIntentById = new Map();
  webhookHarness.subscriptionById = new Map();
  webhookHarness.stripeRetrieveShouldFail = false;
  webhookHarness.stripeSubscriptionRetrieveShouldFail = false;
  webhookHarness.nextGrantInsertFailsOnce = false;
  webhookHarness.nextCreditInsertFailsOnce = false;
}

function tableRows(table) {
  if (table === "specialists") return webhookHarness.specialists;
  if (table === "service_request_promotion_signup_bindings") return webhookHarness.signupBindings;
  if (table === "service_request_promotions") return webhookHarness.promotions;
  if (table === "promoted_request_payments") return webhookHarness.payments;
  if (table === "promoted_request_access_grants") return webhookHarness.accessGrants;
  if (table === "promoted_request_subscription_credits") return webhookHarness.subscriptionCredits;
  if (table === "billing_customers") return webhookHarness.billingCustomers;
  if (table === "billing_events") return webhookHarness.billingEvents;
  if (table === "billing_subscriptions") return webhookHarness.billingSubscriptions;
  if (table === "specialist_plan") return webhookHarness.specialistPlans;
  if (table === "partner_commissions") return webhookHarness.partnerCommissions;
  return [];
}

function violatesUnique(table, row) {
  if (table === "promoted_request_payments") {
    if (row.stripe_checkout_session_id) {
      const dup = webhookHarness.payments.find(
        (p) =>
          p.id !== row.id &&
          p.stripe_checkout_session_id === row.stripe_checkout_session_id,
      );
      if (dup) return "23505";
    }
    if (row.stripe_payment_intent_id) {
      const dup = webhookHarness.payments.find(
        (p) =>
          p.id !== row.id &&
          p.stripe_payment_intent_id === row.stripe_payment_intent_id,
      );
      if (dup) return "23505";
    }
    if (row.stripe_charge_id) {
      const dup = webhookHarness.payments.find(
        (p) => p.id !== row.id && p.stripe_charge_id === row.stripe_charge_id,
      );
      if (dup) return "23505";
    }
    if (row.status === "paid") {
      const dup = webhookHarness.payments.find(
        (p) =>
          p.id !== row.id &&
          p.status === "paid" &&
          p.specialist_id === row.specialist_id &&
          p.promotion_id === row.promotion_id,
      );
      if (dup) return "23505";
    }
  }
  if (table === "promoted_request_access_grants") {
    const dup = webhookHarness.accessGrants.find(
      (g) =>
        g.id !== row.id &&
        g.specialist_id === row.specialist_id &&
        g.promotion_id === row.promotion_id,
    );
    if (dup) return "23505";
  }
  if (table === "promoted_request_subscription_credits") {
    if (row.source_payment_id) {
      const dup = webhookHarness.subscriptionCredits.find(
        (c) => c.id !== row.id && c.source_payment_id === row.source_payment_id,
      );
      if (dup) return "23505";
    }
    if (row.specialist_id) {
      const dup = webhookHarness.subscriptionCredits.find(
        (c) => c.id !== row.id && c.specialist_id === row.specialist_id,
      );
      if (dup) return "23505";
    }
    if (row.consumed_checkout_session_id) {
      const dupSession = webhookHarness.subscriptionCredits.find(
        (c) =>
          c.id !== row.id &&
          c.consumed_checkout_session_id === row.consumed_checkout_session_id,
      );
      if (dupSession) return "23505";
    }
  }
  if (table === "billing_events") {
    const dup = webhookHarness.billingEvents.find(
      (e) => e.provider === row.provider && e.provider_event_id === row.provider_event_id,
    );
    if (dup) return "23505";
  }
  if (table === "billing_subscriptions") {
    const dupProvider = webhookHarness.billingSubscriptions.find(
      (s) =>
        s.provider === row.provider &&
        s.provider_subscription_id === row.provider_subscription_id &&
        s.id !== row.id,
    );
    if (dupProvider) return "23505";
    const currentStatuses = new Set([
      "incomplete",
      "trialing",
      "active",
      "past_due",
      "unpaid",
      "paused",
    ]);
    if (currentStatuses.has(row.status)) {
      const dupCurrent = webhookHarness.billingSubscriptions.find(
        (s) =>
          s.id !== row.id &&
          s.specialist_id === row.specialist_id &&
          currentStatuses.has(s.status),
      );
      if (dupCurrent) return "23505";
    }
  }
  if (table === "specialist_plan") {
    const dup = webhookHarness.specialistPlans.find(
      (p) => p.specialist_id === row.specialist_id && p.id !== row.id,
    );
    if (dup) return "23505";
  }
  if (table === "partner_commissions") {
    const dup = webhookHarness.partnerCommissions.find(
      (c) => c.source_event_id === row.source_event_id && c.id !== row.id,
    );
    if (dup) return "23505";
  }
  return null;
}

class Query {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.operation = "select";
    this.payload = null;
    this.selectColumns = null;
    this.limitCount = null;
  }

  select(columns) {
    if (typeof columns === "string" && columns.trim()) {
      this.selectColumns = columns.split(",").map((c) => c.trim()).filter(Boolean);
    }
    return this;
  }

  projectRow(row) {
    if (!this.selectColumns?.length) return row;
    const out = {};
    for (const key of this.selectColumns) {
      if (key in row) out[key] = row[key];
    }
    return out;
  }

  eq(column, value) {
    this.filters.push({ column, value, op: "eq" });
    return this;
  }

  is(column, value) {
    this.filters.push({ column, value, op: value === null ? "is_null" : "eq" });
    return this;
  }

  gt(column, value) {
    this.filters.push({ column, value, op: "gt" });
    return this;
  }

  neq(column, value) {
    this.filters.push({ column, value, op: "neq" });
    return this;
  }

  filtered() {
    return tableRows(this.table).filter((row) =>
      this.filters.every((f) => {
        if (f.op === "is_null") return row[f.column] == null;
        if (f.op === "gt") {
          const left = Date.parse(String(row[f.column]));
          const right = Date.parse(String(f.value));
          if (!Number.isNaN(left) && !Number.isNaN(right)) return left > right;
          return row[f.column] > f.value;
        }
        if (f.op === "neq") return row[f.column] !== f.value;
        return row[f.column] === f.value;
      }),
    );
  }

  insert(payload) {
    this.operation = "insert";
    this.payload = payload;
    return this;
  }

  update(payload) {
    this.operation = "update";
    this.payload = payload;
    return this;
  }

  handleInsert() {
    const row = {
      id: `${this.table}-${tableRows(this.table).length + 1}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...this.payload,
    };

    if (this.table === "promoted_request_access_grants") {
      if (webhookHarness.nextGrantInsertFailsOnce) {
        webhookHarness.nextGrantInsertFailsOnce = false;
        return { data: null, error: { code: "PGRST500", message: "grant insert failed" } };
      }
      if (webhookHarness.grantInsertError) {
        return { data: null, error: webhookHarness.grantInsertError };
      }
    }

    if (this.table === "promoted_request_subscription_credits") {
      if (webhookHarness.nextCreditInsertFailsOnce) {
        webhookHarness.nextCreditInsertFailsOnce = false;
        return { data: null, error: { code: "PGRST500", message: "credit insert failed" } };
      }
      if (webhookHarness.creditInsertError) {
        return { data: null, error: webhookHarness.creditInsertError };
      }
    }

    if (this.table === "billing_subscriptions" && webhookHarness.billingSubscriptionInsertError) {
      return { data: null, error: webhookHarness.billingSubscriptionInsertError };
    }

    if (this.table === "specialist_plan" && webhookHarness.specialistPlanInsertError) {
      return { data: null, error: webhookHarness.specialistPlanInsertError };
    }

    const uniqueViolation = violatesUnique(this.table, row);
    if (uniqueViolation) {
      return { data: null, error: { code: uniqueViolation } };
    }

    tableRows(this.table).push(row);
    return { data: this.projectRow(row), error: null };
  }

  handleUpdate() {
    if (this.table === "promoted_request_subscription_credits") {
      if (webhookHarness.creditUpdateError) {
        return { data: null, error: webhookHarness.creditUpdateError };
      }
    }
    if (this.table === "promoted_request_payments" && webhookHarness.paymentUpdateError) {
      return { data: null, error: webhookHarness.paymentUpdateError };
    }
    if (this.table === "billing_subscriptions" && webhookHarness.billingSubscriptionUpdateError) {
      return { data: null, error: webhookHarness.billingSubscriptionUpdateError };
    }
    if (this.table === "specialist_plan" && webhookHarness.specialistPlanUpdateError) {
      return { data: null, error: webhookHarness.specialistPlanUpdateError };
    }

    const row = this.filtered()[0];
    if (!row) return { data: null, error: { code: "PGRST116" } };

    const next = { ...row, ...this.payload, updated_at: new Date().toISOString() };
    const uniqueViolation = violatesUnique(this.table, next);
    if (uniqueViolation) {
      return { data: null, error: { code: uniqueViolation } };
    }

    Object.assign(row, next);
    return { data: this.projectRow(row), error: null };
  }

  async single() {
    if (this.operation === "insert") return this.handleInsert();
    if (this.operation === "update") return this.handleUpdate();
    const row = this.filtered()[0] ?? null;
    return {
      data: row ? this.projectRow(row) : null,
      error: row ? null : { code: "PGRST116" },
    };
  }

  async maybeSingle() {
    if (this.operation === "update") return this.handleUpdate();
    const row = this.filtered()[0] ?? null;
    return { data: row ? this.projectRow(row) : null, error: null };
  }

  then(resolve, reject) {
    if (this.operation === "insert") {
      return Promise.resolve(this.single()).then((result) => resolve(result)).catch(reject);
    }
    if (this.operation === "update") {
      return Promise.resolve(this.handleUpdate()).then((result) => resolve(result)).catch(reject);
    }
    const rows = this.filtered().map((row) => this.projectRow(row));
    return Promise.resolve({ data: rows, error: null }).then(resolve).catch(reject);
  }
}

export function createWebhookMockServiceClient() {
  return {
    from(table) {
      return new Query(table);
    },
  };
}

export const PAYMENT_ID = "pay-test-0001";
export const SPECIALIST_ID = "bbbbbbbb-cccc-dddd-eeee-ffffffffffff";
export const PROMOTION_ID = "cccccccc-dddd-eeee-ffff-000000000001";
export const BINDING_ID = "dddddddd-eeee-ffff-0000-111111111111";
export const USER_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
export const SESSION_ID = "cs_test_promoted_001";
export const PI_ID = "pi_test_promoted_001";
export const CHARGE_ID = "ch_test_promoted_001";
export const CUSTOMER_ID = "cus_test_promoted";
export const SUBSCRIPTION_ID = "sub_test_basic_001";
export const BASIC_PRICE_ID = "price_basic_monthly_test";
export const PREMIUM_PRICE_ID = "price_premium_monthly_test";

export function seedSubscriptionCustomer(overrides = {}) {
  webhookHarness.specialists.push({ id: SPECIALIST_ID, user_id: USER_ID, status: "published_unverified" });
  webhookHarness.billingCustomers.push({
    id: "bc-1",
    specialist_id: SPECIALIST_ID,
    provider: "stripe",
    provider_customer_id: CUSTOMER_ID,
    ...overrides,
  });
}

export function buildStripeSubscription(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  const sub = {
    id: SUBSCRIPTION_ID,
    object: "subscription",
    customer: CUSTOMER_ID,
    status: "active",
    cancel_at_period_end: false,
    current_period_start: now,
    current_period_end: now + 30 * 86400,
    trial_start: null,
    trial_end: null,
    canceled_at: null,
    ended_at: null,
    metadata: {
      purpose: "specialist_subscription",
      specialist_id: SPECIALIST_ID,
      plan_code: "basic",
      internal_plan: "basic",
    },
    items: {
      data: [
        {
          price: {
            id: BASIC_PRICE_ID,
            recurring: { interval: "month" },
          },
        },
      ],
    },
    ...overrides,
  };
  webhookHarness.subscriptionById.set(sub.id, sub);
  return sub;
}

export function buildSubscriptionCheckoutSession(overrides = {}) {
  const sub = buildStripeSubscription(overrides.subscription ?? {});
  return {
    id: "cs_test_subscription_001",
    mode: "subscription",
    payment_status: "paid",
    customer: CUSTOMER_ID,
    subscription: sub.id,
    metadata: {
      purpose: "specialist_subscription",
      specialist_id: SPECIALIST_ID,
      plan_code: "basic",
      internal_plan: "basic",
    },
    ...overrides,
  };
}

export function buildStripeEvent(type, object, created = Math.floor(Date.now() / 1000)) {
  return {
    id: `evt_${type.replace(/\./g, "_")}_${Date.now()}`,
    type,
    created,
    data: { object },
  };
}
export function seedPendingPayment(overrides = {}) {
  resetWebhookHarness();
  webhookHarness.billingCustomers.push({
    id: "bc-1",
    specialist_id: SPECIALIST_ID,
    provider: "stripe",
    provider_customer_id: CUSTOMER_ID,
  });
  webhookHarness.payments.push({
    id: PAYMENT_ID,
    signup_binding_id: BINDING_ID,
    promotion_id: PROMOTION_ID,
    specialist_id: SPECIALIST_ID,
    user_id: USER_ID,
    amount_cents: 1000,
    currency: "eur",
    status: "pending",
    stripe_checkout_session_id: SESSION_ID,
    stripe_payment_intent_id: null,
    stripe_charge_id: null,
    paid_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  });
}

export function buildPaidSessionMetadata(overrides = {}) {
  return {
    purpose: "promoted_request_access",
    payment_id: PAYMENT_ID,
    specialist_id: SPECIALIST_ID,
    promotion_id: PROMOTION_ID,
    signup_binding_id: BINDING_ID,
    ...overrides,
  };
}

export function buildPaidCheckoutSession(overrides = {}) {
  return {
    id: SESSION_ID,
    mode: "payment",
    payment_status: "paid",
    currency: "eur",
    amount_total: 1000,
    customer: CUSTOMER_ID,
    metadata: buildPaidSessionMetadata(),
    payment_intent: {
      id: PI_ID,
      latest_charge: CHARGE_ID,
      metadata: {
        purpose: "promoted_request_access",
        payment_id: PAYMENT_ID,
      },
    },
    ...overrides,
  };
}
