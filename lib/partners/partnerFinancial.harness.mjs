/**
 * In-memory Supabase mock for partner financial ledger tests.
 */

export function createPartnerFinancialMock(initial = {}) {
  const tables = structuredClone(initial);
  const auditLog = [];

  function rows(table) {
    if (!tables[table]) tables[table] = [];
    return tables[table];
  }

  class MockQuery {
    constructor(table) {
      this.table = table;
      this.action = "select";
      this.payload = null;
      this.filters = [];
      this.limitCount = null;
      this.returning = null;
    }

    select(cols) {
      this.selectCols = cols;
      if (this.action === "insert" || this.action === "update" || this.action === "delete") {
        this.returning = cols;
      }
      return this;
    }

    insert(payload) {
      this.action = "insert";
      this.payload = payload;
      return this;
    }

    update(payload) {
      this.action = "update";
      this.payload = payload;
      return this;
    }

    delete() {
      this.action = "delete";
      return this;
    }

    eq(column, value) {
      this.filters.push({ type: "eq", column, value });
      return this;
    }

    in(column, values) {
      this.filters.push({ type: "in", column, values: [...values] });
      return this;
    }

    is(column, value) {
      this.filters.push({ type: "is", column, value });
      return this;
    }

    order() {
      return this;
    }

    limit(n) {
      this.limitCount = n;
      return this;
    }

    single() {
      this.singleRow = true;
      return this;
    }

    maybeSingle() {
      this.maybeSingleRow = true;
      return this;
    }

    filterRows(source) {
      let out = [...source];
      for (const f of this.filters) {
        if (f.type === "eq") {
          out = out.filter((row) => row[f.column] === f.value);
        } else if (f.type === "in") {
          out = out.filter((row) => f.values.includes(row[f.column]));
        } else if (f.type === "is") {
          out = out.filter((row) =>
            f.value === null ? row[f.column] == null : row[f.column] === f.value
          );
        }
      }
      if (this.limitCount != null) out = out.slice(0, this.limitCount);
      return out;
    }

    execSelect() {
      const matched = this.filterRows(rows(this.table));
      if (this.maybeSingleRow) {
        return { data: matched[0] ?? null, error: null };
      }
      if (this.singleRow) {
        if (matched.length !== 1) return { data: null, error: { message: "single expected" } };
        return { data: matched[0], error: null };
      }
      return { data: matched, error: null };
    }

    execInsert() {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload];
      const inserted = items.map((item) => {
        const row = {
          id: item.id ?? crypto.randomUUID(),
          ...item,
        };
        const tableRows = rows(this.table);
        if (this.table === "partner_credit_applications") {
          const dup = tableRows.find((r) => r.idempotency_key === row.idempotency_key);
          if (dup) {
            return { error: { message: "duplicate key value violates unique constraint" } };
          }
        }
        tableRows.push(row);
        return row;
      });
      if (inserted[0]?.error) return { data: null, error: inserted[0].error };
      const data = this.singleRow ? inserted[0] : inserted;
      return { data, error: null };
    }

    execUpdate() {
      const tableRows = rows(this.table);
      const matched = this.filterRows(tableRows);
      if (matched.length === 0) return { data: null, error: null };
      const updated = matched.map((row) => {
        Object.assign(row, this.payload);
        return { ...row };
      });
      if (this.maybeSingleRow) return { data: updated[0] ?? null, error: null };
      if (this.singleRow) {
        if (updated.length !== 1) return { data: null, error: { message: "single expected" } };
        return { data: updated[0], error: null };
      }
      return { data: updated, error: null };
    }

    execDelete() {
      const tableRows = rows(this.table);
      const matched = this.filterRows(tableRows);
      for (const row of matched) {
        const idx = tableRows.indexOf(row);
        if (idx >= 0) tableRows.splice(idx, 1);
      }
      return { data: null, error: null };
    }

    then(resolve, reject) {
      try {
        if (this.table === "partner_audit_log" && this.action === "insert") {
          auditLog.push(this.payload);
          return Promise.resolve({ data: null, error: null }).then(resolve, reject);
        }
        let result;
        if (this.action === "insert") result = this.execInsert();
        else if (this.action === "update") result = this.execUpdate();
        else if (this.action === "delete") result = this.execDelete();
        else result = this.execSelect();
        return Promise.resolve(result).then(resolve, reject);
      } catch (err) {
        return Promise.reject(err).then(resolve, reject);
      }
    }
  }

  return {
    supabase: {
      from(table) {
        return new MockQuery(table);
      },
    },
    tables,
    audit: auditLog,
  };
}

export function seedPartnerFinancialFixtures() {
  const partnerId = "11111111-1111-4111-8111-111111111111";
  const userId = "22222222-2222-4222-8222-222222222222";
  const commissionApprovedId = "33333333-3333-4333-8333-333333333333";
  const commissionPendingId = "44444444-4444-4444-8444-444444444444";
  const commissionReversedId = "55555555-5555-4555-8555-555555555555";
  const commissionOtherPartnerId = "66666666-6666-4666-8666-666666666666";
  const otherPartnerId = "77777777-7777-4777-8777-777777777777";

  return {
    partnerId,
    userId,
    commissionApprovedId,
    commissionPendingId,
    commissionReversedId,
    tables: {
      partners: [
        {
          id: partnerId,
          user_id: userId,
          currency: "EUR",
        },
        {
          id: otherPartnerId,
          user_id: "88888888-8888-4888-8888-888888888888",
          currency: "EUR",
        },
      ],
      partner_commissions: [
        {
          id: commissionApprovedId,
          partner_id: partnerId,
          amount_cents: 2900,
          credited_cents: 0,
          paid_out_cents: 0,
          status: "approved",
          currency: "EUR",
          payout_id: null,
        },
        {
          id: commissionPendingId,
          partner_id: partnerId,
          amount_cents: 1000,
          credited_cents: 0,
          paid_out_cents: 0,
          status: "pending",
          currency: "EUR",
          payout_id: null,
        },
        {
          id: commissionReversedId,
          partner_id: partnerId,
          amount_cents: 500,
          credited_cents: 0,
          paid_out_cents: 0,
          status: "reversed",
          currency: "EUR",
          payout_id: null,
        },
        {
          id: commissionOtherPartnerId,
          partner_id: otherPartnerId,
          amount_cents: 2000,
          credited_cents: 0,
          paid_out_cents: 0,
          status: "approved",
          currency: "EUR",
          payout_id: null,
        },
      ],
      partner_credit_applications: [],
      partner_payouts: [],
      partner_audit_log: [],
    },
  };
}
