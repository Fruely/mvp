/**
 * Minimal in-memory Supabase mock for partner attribution integration tests.
 */

export function createAttributionMock(seed = {}) {
  const tables = structuredClone({
    partners: [],
    partner_links: [],
    partner_attributions: [],
    partner_audit_log: [],
    ...seed,
  });

  class MockQuery {
    constructor(table) {
      this.table = table;
      this.action = "select";
      this.payload = null;
      this.filters = [];
    }

    select() {
      return this;
    }

    insert(payload) {
      this.action = "insert";
      this.payload = payload;
      return this;
    }

    eq(column, value) {
      this.filters.push({ type: "eq", column, value });
      return this;
    }

    maybeSingle() {
      this.maybeSingleRow = true;
      return this;
    }

    single() {
      this.singleRow = true;
      return this;
    }

    applyFilters(rows) {
      return rows.filter((row) =>
        this.filters.every((f) => {
          if (f.type === "eq") return row[f.column] === f.value;
          return true;
        })
      );
    }

    async then(resolve, reject) {
      try {
        resolve(await this.execute());
      } catch (err) {
        reject(err);
      }
    }

    execute() {
      const all = tables[this.table] ?? [];
      if (this.action === "select") {
        const filtered = this.applyFilters(all);
        const row = this.singleRow || this.maybeSingleRow ? filtered[0] ?? null : filtered;
        if (this.singleRow && !row) {
          return Promise.resolve({ data: null, error: { message: "not found" } });
        }
        return Promise.resolve({ data: row, error: null });
      }
      if (this.action === "insert") {
        const row = { id: crypto.randomUUID(), ...this.payload };
        all.push(row);
        tables[this.table] = all;
        if (this.singleRow) {
          return Promise.resolve({ data: row, error: null });
        }
        return Promise.resolve({ data: row, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    }
  }

  const supabase = {
    from(table) {
      return new MockQuery(table);
    },
    tables,
  };

  return supabase;
}

export function seedAttributionFixtures() {
  const partnerId = "22222222-2222-2222-2222-222222222222";
  const linkId = "11111111-1111-1111-1111-111111111111";
  const otherPartnerId = "33333333-3333-3333-3333-333333333333";
  const otherLinkId = "44444444-4444-4444-4444-444444444444";
  return {
    partnerId,
    linkId,
    otherPartnerId,
    otherLinkId,
    tables: {
      partners: [
        { id: partnerId, user_id: "partner-user-1", status: "active" },
        { id: otherPartnerId, user_id: "partner-user-2", status: "active" },
      ],
      partner_links: [
        { id: linkId, partner_id: partnerId },
        { id: otherLinkId, partner_id: otherPartnerId },
      ],
      partner_attributions: [],
      partner_audit_log: [],
    },
  };
}
