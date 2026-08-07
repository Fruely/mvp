export const webhookHarness = {
  specialists: [],
  signupBindings: [],
  promotions: [],
  payments: [],
  planPayments: [],
  accessGrants: [],
  subscriptionCredits: [],
  billingCustomers: [],
  billingEvents: [],
  billingSubscriptions: [],
  specialistPlans: [],
  partnerCommissions: [],
  paymentUpdateError: null,
  planPaymentUpdateError: null,
  planPaymentFulfillmentError: null,
  planPaymentFulfillmentInFlight: null,
  specialistPlanLocks: new Map(),
  grantInsertError: null,
  creditUpdateError: null,
  stripeCouponShouldFail: false,
  billingSubscriptionInsertError: null,
  billingSubscriptionUpdateError: null,
  specialistPlanInsertError: null,
  specialistPlanUpdateError: null,
  paymentIntentById: new Map(),
  checkoutSessionById: new Map(),
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
  webhookHarness.planPayments = [];
  webhookHarness.accessGrants = [];
  webhookHarness.subscriptionCredits = [];
  webhookHarness.billingCustomers = [];
  webhookHarness.billingEvents = [];
  webhookHarness.billingSubscriptions = [];
  webhookHarness.specialistPlans = [];
  webhookHarness.partnerCommissions = [];
  webhookHarness.paymentUpdateError = null;
  webhookHarness.planPaymentUpdateError = null;
  webhookHarness.planPaymentFulfillmentError = null;
  webhookHarness.planPaymentFulfillmentInFlight = null;
  webhookHarness.specialistPlanLocks = new Map();
  webhookHarness.grantInsertError = null;
  webhookHarness.creditInsertError = null;
  webhookHarness.creditUpdateError = null;
  webhookHarness.stripeCouponShouldFail = false;
  webhookHarness.billingSubscriptionInsertError = null;
  webhookHarness.billingSubscriptionUpdateError = null;
  webhookHarness.specialistPlanInsertError = null;
  webhookHarness.specialistPlanUpdateError = null;
  webhookHarness.paymentIntentById = new Map();
  webhookHarness.checkoutSessionById = new Map();
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
  if (table === "plan_payments") return webhookHarness.planPayments;
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

export function pgAddCalendarMonth(iso) {
  const d = new Date(iso);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();
  const hour = d.getUTCHours();
  const min = d.getUTCMinutes();
  const sec = d.getUTCSeconds();
  const ms = d.getUTCMilliseconds();
  let targetMonth = month + 1;
  let targetYear = year;
  if (targetMonth > 11) {
    targetMonth = 0;
    targetYear += 1;
  }
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, lastDay);
  return new Date(Date.UTC(targetYear, targetMonth, targetDay, hour, min, sec, ms)).toISOString();
}

async function withSpecialistPlanLock(specialistId, fn) {
  while (webhookHarness.specialistPlanLocks.has(specialistId)) {
    await webhookHarness.specialistPlanLocks.get(specialistId);
  }
  let release;
  const lock = new Promise((resolve) => {
    release = resolve;
  });
  webhookHarness.specialistPlanLocks.set(specialistId, lock);
  try {
    return await fn();
  } finally {
    webhookHarness.specialistPlanLocks.delete(specialistId);
    release();
  }
}

async function fulfillPlanPaymentEntitlementRpc(args) {
  if (webhookHarness.planPaymentFulfillmentError) {
    return { data: null, error: webhookHarness.planPaymentFulfillmentError };
  }

  const paymentId = args.p_plan_payment_id;
  const paidAtInput = args.p_paid_at;
  const paymentIntentId = args.p_stripe_payment_intent_id;
  const chargeId = args.p_stripe_charge_id;
  const sessionId = args.p_stripe_checkout_session_id;

  if (!paymentId || !paidAtInput || !paymentIntentId || !sessionId) {
    return { data: { outcome: "invalid_input" }, error: null };
  }

  const payment = webhookHarness.planPayments.find((p) => p.id === paymentId);
  if (!payment) {
    return { data: { outcome: "not_found" }, error: null };
  }

  if (
    payment.stripe_checkout_session_id &&
    payment.stripe_checkout_session_id !== sessionId
  ) {
    return { data: null, error: { message: "plan_payment_session_mismatch" } };
  }

  if (
    payment.stripe_payment_intent_id &&
    payment.stripe_payment_intent_id !== paymentIntentId
  ) {
    return { data: null, error: { message: "plan_payment_intent_mismatch" } };
  }

  if (
    payment.stripe_charge_id &&
    chargeId &&
    payment.stripe_charge_id !== chargeId
  ) {
    return { data: null, error: { message: "plan_payment_charge_mismatch" } };
  }

  if (payment.entitlement_applied_at) {
    return {
      data: {
        outcome: "already_applied",
        plan_payment_id: payment.id,
        specialist_id: payment.specialist_id,
        prior_expires_at: payment.prior_expires_at,
        period_end_at: payment.period_end_at,
        promoted_credit_consumed: Boolean(payment.promoted_credit_id),
        paid_at: payment.paid_at,
      },
      error: null,
    };
  }

  if (!["checkout_created", "paid"].includes(payment.status)) {
    return { data: { outcome: "invalid_status", status: payment.status }, error: null };
  }

  return withSpecialistPlanLock(payment.specialist_id, async () => {
    const paidAt = payment.paid_at ?? paidAtInput;
    const now = new Date().toISOString();
    let creditConsumed = false;

    let planCreated = false;
    let plan = webhookHarness.specialistPlans.find((p) => p.specialist_id === payment.specialist_id);
    if (!plan) {
      planCreated = true;
      plan = {
        id: `sp-${webhookHarness.specialistPlans.length + 1}`,
        specialist_id: payment.specialist_id,
        plan_code: payment.plan_code,
        plan_status: "active",
        started_at: paidAt,
        expires_at: paidAt,
        grace_until: paidAt,
        created_at: now,
        updated_at: now,
      };
      webhookHarness.specialistPlans.push(plan);
    }

    const priorExpires = planCreated ? null : plan.expires_at;
    const base =
      plan.expires_at && Date.parse(plan.expires_at) > Date.parse(paidAt)
        ? plan.expires_at
        : paidAt;
    const newExpires = pgAddCalendarMonth(base);
    const graceUntil = new Date(Date.parse(newExpires) + 7 * 86400000).toISOString();

    plan.plan_code = payment.plan_code;
    plan.plan_status = "active";
    if (!plan.started_at) plan.started_at = paidAt;
    plan.expires_at = newExpires;
    plan.grace_until = graceUntil;
    plan.updated_at = now;

    if (payment.promoted_credit_id) {
      const credit = webhookHarness.subscriptionCredits.find(
        (c) => c.id === payment.promoted_credit_id,
      );
      if (!credit) {
        return { data: null, error: { message: "plan_payment_credit_not_found" } };
      }
      if (credit.specialist_id !== payment.specialist_id) {
        return { data: null, error: { message: "plan_payment_credit_specialist_mismatch" } };
      }
      if (credit.consumed_at) {
        if (credit.consumed_checkout_session_id !== sessionId) {
          return { data: null, error: { message: "plan_payment_credit_consumed_other_session" } };
        }
      } else {
        credit.consumed_at = paidAt;
        credit.consumed_checkout_session_id = sessionId;
        credit.consumed_plan_code = payment.plan_code;
        credit.updated_at = now;
        creditConsumed = true;
      }
    }

    payment.status = "paid";
    payment.paid_at = paidAt;
    payment.stripe_payment_intent_id = payment.stripe_payment_intent_id ?? paymentIntentId;
    payment.stripe_charge_id = payment.stripe_charge_id ?? chargeId;
    payment.stripe_checkout_session_id = payment.stripe_checkout_session_id ?? sessionId;
    payment.entitlement_applied_at = now;
    payment.prior_expires_at = priorExpires;
    payment.period_end_at = newExpires;
    payment.updated_at = now;

    return {
      data: {
        outcome: "applied",
        plan_payment_id: payment.id,
        specialist_id: payment.specialist_id,
        prior_expires_at: priorExpires,
        period_end_at: newExpires,
        promoted_credit_consumed: creditConsumed,
        paid_at: paidAt,
      },
      error: null,
    };
  });
}

class Query {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.operation = "select";
    this.payload = null;
    this.selectColumns = null;
    this.limitCount = null;
    this.orderColumn = null;
    this.orderAscending = true;
    this.inFilters = [];
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

  in(column, values) {
    this.inFilters.push({ column, values });
    return this;
  }

  order(column, options = {}) {
    this.orderColumn = column;
    this.orderAscending = options.ascending !== false;
    return this;
  }

  limit(count) {
    this.limitCount = count;
    return this;
  }

  filtered() {
    let rows = tableRows(this.table).filter((row) =>
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

    for (const f of this.inFilters) {
      rows = rows.filter((row) => f.values.includes(row[f.column]));
    }

    if (this.orderColumn) {
      rows = [...rows].sort((a, b) => {
        const left = a[this.orderColumn];
        const right = b[this.orderColumn];
        const cmp = String(left).localeCompare(String(right));
        return this.orderAscending ? cmp : -cmp;
      });
    }

    if (this.limitCount != null) {
      rows = rows.slice(0, this.limitCount);
    }

    return rows;
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
    if (this.table === "plan_payments" && webhookHarness.planPaymentUpdateError) {
      return { data: null, error: webhookHarness.planPaymentUpdateError };
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

async function reconcileSpecialistAccessRpc(args) {
  if (webhookHarness.planPaymentReconcileError) {
    return { data: null, error: webhookHarness.planPaymentReconcileError };
  }

  const specialistId = args.p_specialist_id;
  if (!specialistId) {
    return { data: { outcome: "invalid_input" }, error: null };
  }

  const hasBilling = webhookHarness.planPayments.some(
    (p) =>
      p.specialist_id === specialistId &&
      p.entitlement_applied_at != null &&
      (p.status === "paid" || p.status === "refunded"),
  );

  return withSpecialistPlanLock(specialistId, async () => {
    const plan = webhookHarness.specialistPlans.find(
      (p) => p.specialist_id === specialistId,
    );
    if (!plan) {
      if (!hasBilling) {
        return { data: { outcome: "no_billing_history" }, error: null };
      }
      return { data: { outcome: "no_plan_row" }, error: null };
    }

    if (!hasBilling && !plan.lifecycle_enrolled_at) {
      return { data: { outcome: "no_billing_history" }, error: null };
    }

    const now = new Date().toISOString();
    const nowMs = Date.now();
    const oldStatus = plan.plan_status;

    const paidPayments = webhookHarness.planPayments
      .filter(
        (p) =>
          p.specialist_id === specialistId &&
          p.status === "paid" &&
          p.entitlement_applied_at != null &&
          p.period_end_at != null,
      )
      .sort((a, b) => Date.parse(b.period_end_at) - Date.parse(a.period_end_at));

    const bestPaid = paidPayments[0];
    const maxPaidExpiresMs = bestPaid ? Date.parse(bestPaid.period_end_at) : null;
    const naturalGraceMs =
      maxPaidExpiresMs != null ? maxPaidExpiresMs + 7 * 86400000 : null;

    const refundedPayments = webhookHarness.planPayments.filter(
      (p) =>
        p.specialist_id === specialistId &&
        p.status === "refunded" &&
        p.entitlement_applied_at != null &&
        p.refunded_at != null,
    );
    const maxRefundedAtMs = refundedPayments.length > 0
      ? Math.max(...refundedPayments.map((p) => Date.parse(p.refunded_at)))
      : null;
    const refundGraceMs =
      maxRefundedAtMs != null ? maxRefundedAtMs + 7 * 86400000 : null;

    const initialGraceMs = plan.lifecycle_enrolled_at
      ? Date.parse(plan.lifecycle_enrolled_at) + 7 * 86400000
      : null;

    let newStatus;
    let newGraceUntil;
    let effectivePlan = plan.plan_code;

    if (maxPaidExpiresMs != null && maxPaidExpiresMs > nowMs) {
      newStatus = "active";
      newGraceUntil = naturalGraceMs != null ? new Date(naturalGraceMs).toISOString() : null;
      effectivePlan = bestPaid.plan_code;

      plan.plan_code = bestPaid.plan_code;
      plan.plan_status = "active";
      plan.expires_at = bestPaid.period_end_at;
      plan.grace_until = newGraceUntil;
      plan.updated_at = now;
    } else {
      const bestGraceMs = Math.max(
        naturalGraceMs ?? -Infinity,
        refundGraceMs ?? -Infinity,
        initialGraceMs ?? -Infinity,
      );

      effectivePlan = bestPaid ? bestPaid.plan_code : plan.plan_code;

      if (bestGraceMs > nowMs) {
        newStatus = "grace";
        newGraceUntil = new Date(bestGraceMs).toISOString();

        plan.plan_code = effectivePlan;
        plan.plan_status = "grace";
        plan.expires_at = bestPaid ? bestPaid.period_end_at : null;
        plan.grace_until = newGraceUntil;
        plan.updated_at = now;
      } else {
        newStatus = "inactive";
        newGraceUntil = null;

        plan.plan_code = effectivePlan;
        plan.plan_status = "inactive";
        plan.expires_at = null;
        plan.grace_until = null;
        plan.updated_at = now;
      }
    }

    const specialist = webhookHarness.specialists.find(
      (s) => s.id === specialistId,
    );
    if (specialist) {
      specialist.billing_visibility_blocked = newStatus === "inactive";
    }

    return {
      data: {
        outcome: oldStatus !== newStatus ? "transitioned" : "unchanged",
        specialist_id: specialistId,
        lifecycle_status: newStatus,
        previous_status: oldStatus,
        expires_at: plan.expires_at,
        grace_until: newGraceUntil,
        plan_code: effectivePlan,
      },
      error: null,
    };
  });
}

export function createWebhookMockServiceClient() {
  return {
    from(table) {
      return new Query(table);
    },
    rpc(fn, args) {
      if (fn === "fulfill_plan_payment_entitlement") {
        return fulfillPlanPaymentEntitlementRpc(args);
      }
      if (fn === "reconcile_specialist_access") {
        return reconcileSpecialistAccessRpc(args);
      }
      return Promise.resolve({ data: null, error: { message: "unknown_rpc" } });
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
export const PLAN_PAYMENT_ID = "pp-test-0001";
export const PLAN_PAYMENT_SESSION_ID = "cs_test_plan_payment_001";
export const PLAN_PAYMENT_PI_ID = "pi_test_plan_payment_001";
export const PLAN_PAYMENT_CHARGE_ID = "ch_test_plan_payment_001";
export const PROMOTED_CREDIT_ID = "credit-test-0001";

export function seedSubscriptionCustomer(overrides = {}) {
  webhookHarness.specialists.push({ id: SPECIALIST_ID, user_id: USER_ID, status: "published_unverified", billing_visibility_blocked: false });
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

export function buildPlanPaymentMetadata(overrides = {}) {
  return {
    purpose: "specialist_plan_payment",
    plan_payment_id: PLAN_PAYMENT_ID,
    specialist_id: SPECIALIST_ID,
    user_id: USER_ID,
    plan_code: "basic",
    billing_interval: "month",
    ...overrides,
  };
}

export function seedPlanPaymentCheckout(overrides = {}) {
  const gross = overrides.gross_amount_cents ?? 2900;
  const discount = overrides.discount_amount_cents ?? 0;
  const net = overrides.net_amount_cents ?? gross - discount;
  const planCode = overrides.plan_code ?? "basic";
  const priceId = planCode === "premium" ? PREMIUM_PRICE_ID : BASIC_PRICE_ID;

  webhookHarness.planPayments.push({
    id: PLAN_PAYMENT_ID,
    specialist_id: SPECIALIST_ID,
    user_id: USER_ID,
    status: "checkout_created",
    plan_code: planCode,
    billing_interval: "month",
    currency: "eur",
    gross_amount_cents: gross,
    discount_amount_cents: discount,
    net_amount_cents: net,
    provider_customer_id: CUSTOMER_ID,
    provider_price_id: priceId,
    stripe_checkout_session_id: PLAN_PAYMENT_SESSION_ID,
    stripe_payment_intent_id: null,
    stripe_charge_id: null,
    promoted_credit_id: overrides.promoted_credit_id ?? null,
    entitlement_applied_at: null,
    prior_expires_at: null,
    period_end_at: null,
    paid_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  });
}

export function buildPlanPaymentCheckoutSession(overrides = {}) {
  const payment = webhookHarness.planPayments[0];
  const gross = payment?.gross_amount_cents ?? 2900;
  const net = payment?.net_amount_cents ?? gross;
  const priceId = payment?.provider_price_id ?? BASIC_PRICE_ID;
  const chargeCreated = overrides.chargeCreated ?? Math.floor(Date.now() / 1000);
  const eventCreated = overrides.eventCreated ?? chargeCreated;
  const { chargeCreated: _c, eventCreated: _e, ...sessionOverrides } = overrides;

  const session = {
    id: PLAN_PAYMENT_SESSION_ID,
    mode: "payment",
    payment_status: "paid",
    currency: "eur",
    amount_subtotal: gross,
    amount_total: net,
    customer: CUSTOMER_ID,
    client_reference_id: PLAN_PAYMENT_ID,
    metadata: buildPlanPaymentMetadata({
      plan_code: payment?.plan_code ?? "basic",
    }),
    payment_intent: {
      id: PLAN_PAYMENT_PI_ID,
      latest_charge: {
        id: PLAN_PAYMENT_CHARGE_ID,
        created: chargeCreated,
      },
      metadata: buildPlanPaymentMetadata(),
    },
    line_items: {
      data: [{ price: { id: priceId } }],
    },
    ...sessionOverrides,
  };

  webhookHarness.checkoutSessionById.set(session.id, session);
  webhookHarness.paymentIntentById.set(PLAN_PAYMENT_PI_ID, session.payment_intent);
  return { session, eventCreated };
}

export function seedPlanPaymentContext(overrides = {}) {
  resetWebhookHarness();
  seedSubscriptionCustomer();
  if (overrides.specialistPlan) {
    webhookHarness.specialistPlans.push({
      id: "sp-1",
      specialist_id: SPECIALIST_ID,
      plan_code: overrides.specialistPlan.plan_code ?? "basic",
      plan_status: overrides.specialistPlan.plan_status ?? "active",
      started_at: overrides.specialistPlan.started_at ?? null,
      expires_at: overrides.specialistPlan.expires_at ?? null,
      grace_until: overrides.specialistPlan.grace_until ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
  if (overrides.credit) {
    webhookHarness.subscriptionCredits.push({
      id: PROMOTED_CREDIT_ID,
      specialist_id: SPECIALIST_ID,
      amount_cents: 1000,
      currency: "eur",
      consumed_at: null,
      consumed_checkout_session_id: null,
      consumed_plan_code: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides.credit,
    });
  }
  seedPlanPaymentCheckout(overrides.planPayment ?? {});
}
