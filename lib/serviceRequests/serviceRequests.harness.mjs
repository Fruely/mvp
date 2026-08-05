export const harness = {
  rows: [],
  promotionRows: [],
  insertError: null,
  fetchError: null,
  updateError: null,
  promotionInsertError: null,
  promotionFetchError: null,
  promotionUpdateError: null,
  promotionInsertAttempts: 0,
  notifyCalls: [],
  notifyShouldFail: false,
  adminTokenExpected: "test-admin-token",
  adminSessionValid: true,
};

export function resetHarness() {
  harness.rows = [];
  harness.promotionRows = [];
  harness.insertError = null;
  harness.fetchError = null;
  harness.updateError = null;
  harness.promotionInsertError = null;
  harness.promotionFetchError = null;
  harness.promotionUpdateError = null;
  harness.promotionInsertAttempts = 0;
  harness.notifyCalls = [];
  harness.notifyShouldFail = false;
  harness.adminSessionValid = true;
}

function tableRows(table) {
  return table === "service_request_promotions" ? harness.promotionRows : harness.rows;
}

class Query {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.operation = "select";
    this.payload = null;
    this.orderBy = null;
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
    this.filters.push({ column, value });
    return this;
  }

  order(column, opts) {
    this.orderBy = { column, ascending: opts?.ascending !== false };
    return this;
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

  filtered() {
    return tableRows(this.table).filter((row) =>
      this.filters.every((f) => row[f.column] === f.value),
    );
  }

  async single() {
    if (this.operation === "update") {
      if (this.table === "service_request_promotions" && harness.promotionUpdateError) {
        return { data: null, error: harness.promotionUpdateError };
      }
      if (this.table === "service_requests" && harness.updateError) {
        return { data: null, error: harness.updateError };
      }
      const row = this.filtered()[0];
      if (!row) return { data: null, error: { code: "PGRST116" } };
      Object.assign(row, this.payload, { updated_at: new Date().toISOString() });
      return { data: this.projectRow(row), error: null };
    }
    if (this.operation === "insert") {
      if (this.table === "service_request_promotions") {
        harness.promotionInsertAttempts += 1;
        if (harness.promotionInsertError) {
          return { data: null, error: harness.promotionInsertError };
        }
        const row = {
          id: `promo-${harness.promotionRows.length + 1}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          published_at: null,
          closed_at: null,
          status: "draft",
          ...this.payload,
        };
        if (
          harness.promotionRows.some(
            (existing) =>
              existing.service_request_id === row.service_request_id ||
              existing.public_token === row.public_token,
          )
        ) {
          const field =
            harness.promotionRows.some((e) => e.service_request_id === row.service_request_id)
              ? "service_request_id"
              : "public_token";
          return {
            data: null,
            error: { code: "23505", message: `duplicate key value violates unique constraint on ${field}` },
          };
        }
        harness.promotionRows.push(row);
        return { data: this.projectRow(row), error: null };
      }
      if (harness.insertError) return { data: null, error: harness.insertError };
      const row = {
        id: "11111111-2222-3333-4444-555555555555",
        created_at: new Date().toISOString(),
        ...this.payload,
      };
      harness.rows.push(row);
      return { data: { public_id: row.public_id, created_at: row.created_at }, error: null };
    }
    const row = this.filtered()[0] ?? null;
    return { data: row ? this.projectRow(row) : null, error: row ? null : { code: "PGRST116" } };
  }

  async maybeSingle() {
    if (this.table === "service_request_promotions" && this.operation === "select" && harness.promotionFetchError) {
      return { data: null, error: harness.promotionFetchError };
    }
    if (this.table === "service_requests" && this.operation === "select" && harness.fetchError) {
      return { data: null, error: harness.fetchError };
    }
    if (this.operation === "update") {
      if (this.table === "service_request_promotions" && harness.promotionUpdateError) {
        return { data: null, error: harness.promotionUpdateError };
      }
      if (this.table === "service_requests" && harness.updateError) {
        return { data: null, error: harness.updateError };
      }
      const rows = tableRows(this.table);
      const row = this.filtered()[0];
      if (!row) return { data: null, error: null };
      Object.assign(row, this.payload, { updated_at: new Date().toISOString() });
      return { data: this.projectRow(row), error: null };
    }
    const row = this.filtered()[0] ?? null;
    return { data: row ? this.projectRow(row) : null, error: null };
  }

  then(resolve, reject) {
    if (this.operation === "select") {
      if (harness.fetchError) {
        return Promise.resolve(resolve({ data: null, error: harness.fetchError })).catch(reject);
      }
      let rows = this.filtered().map((row) => this.projectRow(row));
      if (this.orderBy?.column) {
        rows.sort((a, b) => {
          const av = a[this.orderBy.column];
          const bv = b[this.orderBy.column];
          return this.orderBy.ascending
            ? String(av).localeCompare(String(bv))
            : String(bv).localeCompare(String(av));
        });
      }
      return Promise.resolve(resolve({ data: rows, error: null })).catch(reject);
    }
    return Promise.reject(new Error("unsupported query")).catch(reject);
  }
}

export function createMockServiceClient() {
  return {
    from(table) {
      return new Query(table);
    },
  };
}
