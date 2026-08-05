export const billingHarness = {
  specialists: [],
  signupBindings: [],
  promotions: [],
  payments: [],
  accessGrants: [],
  specialistPlans: [],
  billingCustomers: [],
  subscriptionCredits: [],
  paymentInsertError: null,
  paymentUpdateError: null,
  stripeShouldFail: false,
  couponShouldFail: false,
  stripeSessions: [],
  stripeCoupons: [],
  authUser: { id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", email: "spec@test.example" },
  authShouldFail: false,
};

export function resetBillingHarness() {
  billingHarness.specialists = [];
  billingHarness.signupBindings = [];
  billingHarness.promotions = [];
  billingHarness.payments = [];
  billingHarness.accessGrants = [];
  billingHarness.specialistPlans = [];
  billingHarness.billingCustomers = [];
  billingHarness.subscriptionCredits = [];
  billingHarness.paymentInsertError = null;
  billingHarness.paymentUpdateError = null;
  billingHarness.stripeShouldFail = false;
  billingHarness.couponShouldFail = false;
  billingHarness.stripeSessions = [];
  billingHarness.stripeCoupons = [];
  billingHarness.authUser = {
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    email: "spec@test.example",
  };
  billingHarness.authShouldFail = false;
}

function tableRows(table) {
  if (table === "specialists") return billingHarness.specialists;
  if (table === "service_request_promotion_signup_bindings") return billingHarness.signupBindings;
  if (table === "service_request_promotions") return billingHarness.promotions;
  if (table === "promoted_request_payments") return billingHarness.payments;
  if (table === "promoted_request_access_grants") return billingHarness.accessGrants;
  if (table === "specialist_plan") return billingHarness.specialistPlans;
  if (table === "billing_customers") return billingHarness.billingCustomers;
  if (table === "promoted_request_subscription_credits") return billingHarness.subscriptionCredits;
  return [];
}

class Query {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.operation = "select";
    this.payload = null;
    this.selectColumns = null;
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
    if (this.table === "promoted_request_payments") {
      if (billingHarness.paymentInsertError) {
        return { data: null, error: billingHarness.paymentInsertError };
      }
      const row = {
        id: `pay-${billingHarness.payments.length + 1}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...this.payload,
      };
      billingHarness.payments.push(row);
      return { data: this.projectRow(row), error: null };
    }
    if (this.table === "billing_customers") {
      const row = {
        id: `bc-${billingHarness.billingCustomers.length + 1}`,
        provider: "stripe",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...this.payload,
      };
      billingHarness.billingCustomers.push(row);
      return { data: this.projectRow(row), error: null };
    }
    return { data: null, error: null };
  }

  handleUpdate() {
    if (this.table === "promoted_request_payments" && billingHarness.paymentUpdateError) {
      return { data: null, error: billingHarness.paymentUpdateError };
    }
    const row = this.filtered()[0];
    if (!row) return { data: null, error: { code: "PGRST116" } };
    Object.assign(row, this.payload, { updated_at: new Date().toISOString() });
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
    return Promise.reject(new Error("unsupported query")).catch(reject);
  }
}

export function createBillingMockServiceClient() {
  return {
    from(table) {
      return new Query(table);
    },
  };
}

export function createBillingMockAuthClient() {
  return {
    auth: {
      async getUser() {
        if (billingHarness.authShouldFail) {
          return { data: { user: null }, error: { message: "no session" } };
        }
        return { data: { user: billingHarness.authUser }, error: null };
      },
    },
  };
}
