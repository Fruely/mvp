export const webhookHarness = {
  specialists: [],
  signupBindings: [],
  promotions: [],
  payments: [],
  accessGrants: [],
  subscriptionCredits: [],
  billingCustomers: [],
  billingEvents: [],
  paymentUpdateError: null,
  grantInsertError: null,
  creditInsertError: null,
  paymentIntentById: new Map(),
  stripeRetrieveShouldFail: false,
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
  webhookHarness.paymentUpdateError = null;
  webhookHarness.grantInsertError = null;
  webhookHarness.creditInsertError = null;
  webhookHarness.paymentIntentById = new Map();
  webhookHarness.stripeRetrieveShouldFail = false;
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
  }
  if (table === "billing_events") {
    const dup = webhookHarness.billingEvents.find(
      (e) => e.provider === row.provider && e.provider_event_id === row.provider_event_id,
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

  neq(column, value) {
    this.filters.push({ column, value, op: "neq" });
    return this;
  }

  filtered() {
    return tableRows(this.table).filter((row) =>
      this.filters.every((f) => {
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

    const uniqueViolation = violatesUnique(this.table, row);
    if (uniqueViolation) {
      return { data: null, error: { code: uniqueViolation } };
    }

    tableRows(this.table).push(row);
    return { data: this.projectRow(row), error: null };
  }

  handleUpdate() {
    if (this.table === "promoted_request_payments" && webhookHarness.paymentUpdateError) {
      return { data: null, error: webhookHarness.paymentUpdateError };
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

export function buildStripeEvent(type, object) {
  return {
    id: `evt_${type.replace(/\./g, "_")}_${Date.now()}`,
    type,
    data: { object },
  };
}
