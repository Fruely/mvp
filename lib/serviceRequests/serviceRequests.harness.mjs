export const harness = {
  rows: [],
  promotionRows: [],
  attributionRows: [],
  insertError: null,
  fetchError: null,
  updateError: null,
  promotionInsertError: null,
  promotionFetchError: null,
  promotionUpdateError: null,
  promotionInsertAttempts: 0,
  attributionInsertError: null,
  attributionFetchError: null,
  attributionUpdateError: null,
  promotionCaptureError: null,
  notifyCalls: [],
  notifyShouldFail: false,
  adminTokenExpected: "test-admin-token",
  adminSessionValid: true,
};

export function resetHarness() {
  harness.rows = [];
  harness.promotionRows = [];
  harness.attributionRows = [];
  harness.insertError = null;
  harness.fetchError = null;
  harness.updateError = null;
  harness.promotionInsertError = null;
  harness.promotionFetchError = null;
  harness.promotionUpdateError = null;
  harness.promotionInsertAttempts = 0;
  harness.attributionInsertError = null;
  harness.attributionFetchError = null;
  harness.attributionUpdateError = null;
  harness.promotionCaptureError = null;
  harness.notifyCalls = [];
  harness.notifyShouldFail = false;
  harness.adminSessionValid = true;
}

function tableRows(table) {
  if (table === "service_request_promotion_attributions") return harness.attributionRows;
  if (table === "service_request_promotions") return harness.promotionRows;
  return harness.rows;
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
      if (this.table === "service_request_promotion_attributions" && harness.attributionUpdateError) {
        return { data: null, error: harness.attributionUpdateError };
      }
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
      if (this.table === "service_request_promotion_attributions") {
        if (harness.attributionInsertError) {
          return { data: null, error: harness.attributionInsertError };
        }
        const row = {
          id: `attr-${harness.attributionRows.length + 1}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          visit_count: 1,
          ...this.payload,
        };
        if (harness.attributionRows.some((existing) => existing.attribution_token === row.attribution_token)) {
          return {
            data: null,
            error: { code: "23505", message: "duplicate key value violates unique constraint on attribution_token" },
          };
        }
        harness.attributionRows.push(row);
        return { data: this.projectRow(row), error: null };
      }
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
    if (this.table === "service_request_promotion_attributions" && this.operation === "select") {
      if (harness.attributionFetchError) {
        return { data: null, error: harness.attributionFetchError };
      }
    }
    if (this.table === "service_request_promotions" && this.operation === "select" && harness.promotionFetchError) {
      return { data: null, error: harness.promotionFetchError };
    }
    if (this.table === "service_requests" && this.operation === "select" && harness.fetchError) {
      return { data: null, error: harness.fetchError };
    }
    if (this.table === "service_request_promotions" && this.operation === "select" && harness.promotionCaptureError) {
      return { data: null, error: harness.promotionCaptureError };
    }
    if (this.operation === "update") {
      if (this.table === "service_request_promotion_attributions" && harness.attributionUpdateError) {
        return { data: null, error: harness.attributionUpdateError };
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
    if (this.operation === "update") {
      if (this.table === "service_request_promotion_attributions" && harness.attributionUpdateError) {
        return Promise.resolve(resolve({ data: null, error: harness.attributionUpdateError })).catch(reject);
      }
      if (this.table === "service_request_promotions" && harness.promotionUpdateError) {
        return Promise.resolve(resolve({ data: null, error: harness.promotionUpdateError })).catch(reject);
      }
      if (this.table === "service_requests" && harness.updateError) {
        return Promise.resolve(resolve({ data: null, error: harness.updateError })).catch(reject);
      }
      const row = this.filtered()[0];
      if (!row) return Promise.resolve(resolve({ data: null, error: null })).catch(reject);
      Object.assign(row, this.payload, { updated_at: new Date().toISOString() });
      return Promise.resolve(resolve({ data: null, error: null })).catch(reject);
    }
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
