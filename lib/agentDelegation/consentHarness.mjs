const NOW_ISO = "2026-09-21T20:00:00.000Z";

export const consentHarness = {
  nowIso: NOW_ISO,
  auth: { kind: "absent" },
  clients: [],
  delegations: [],
  deleteCalls: [],
  operations: [],
};

let rowSeq = 0;

function nextId(kind) {
  rowSeq += 1;
  const n = String(rowSeq).padStart(12, "0");
  if (kind === "client") return `11111111-1111-4111-8111-${n}`;
  return `44444444-4444-4444-8444-${n}`;
}

export function resetConsentHarness() {
  consentHarness.nowIso = NOW_ISO;
  consentHarness.auth = { kind: "absent" };
  consentHarness.clients = [];
  consentHarness.delegations = [];
  consentHarness.deleteCalls = [];
  consentHarness.operations = [];
  rowSeq = 0;
}

export function seedClient(overrides = {}) {
  const row = {
    id: overrides.id ?? nextId("client"),
    name: overrides.name ?? "Example business agent",
    client_type: overrides.client_type ?? "business_agent",
    provider: overrides.provider ?? "example",
    status: overrides.status ?? "active",
    scopes: overrides.scopes ?? ["requests:create"],
    owner_user_id: overrides.owner_user_id ?? null,
    specialist_id: overrides.specialist_id ?? null,
    created_at: consentHarness.nowIso,
    updated_at: consentHarness.nowIso,
  };
  consentHarness.clients.push(row);
  return row;
}

function pickColumns(row, columns) {
  if (!columns || columns === "*") return { ...row };
  const keys = columns.split(",").map((key) => key.trim());
  const picked = {};
  for (const key of keys) picked[key] = row[key] ?? null;
  return picked;
}

function matches(row, filters) {
  return Object.entries(filters).every(([key, value]) => {
    if (Array.isArray(value)) return value.includes(row[key]);
    return row[key] === value;
  });
}

class TableQuery {
  constructor(table) {
    this.table = table;
    this.op = "select";
    this.payload = null;
    this.filters = {};
    this.columns = "*";
    this.orderColumn = null;
    this.orderAscending = true;
  }

  insert(row) {
    this.op = "insert";
    this.payload = { ...row };
    return this;
  }

  update(row) {
    this.op = "update";
    this.payload = { ...row };
    return this;
  }

  select(columns = "*") {
    this.columns = columns;
    return this;
  }

  eq(column, value) {
    this.filters[column] = value;
    return this;
  }

  in(column, values) {
    this.filters[column] = values;
    return this;
  }

  order(column, options = {}) {
    this.orderColumn = column;
    this.orderAscending = options.ascending !== false;
    return this;
  }

  delete() {
    consentHarness.deleteCalls.push({ table: this.table });
    this.op = "delete";
    return this;
  }

  then(onFulfilled, onRejected) {
    return Promise.resolve(this.executeList()).then(onFulfilled, onRejected);
  }

  async single() {
    return this.execute(true);
  }

  async maybeSingle() {
    return this.execute(false);
  }

  rows() {
    if (this.table === "agent_clients") return consentHarness.clients;
    if (this.table === "agent_delegations") return consentHarness.delegations;
    return [];
  }

  execute(requireRow) {
    consentHarness.operations.push({
      table: this.table,
      op: this.op,
      payload: this.payload ? { ...this.payload } : null,
    });
    if (this.op === "delete") {
      return { data: null, error: { message: "delete is not allowed" } };
    }
    if (this.op === "insert") {
      const row = {
        id: this.table === "agent_delegations" ? nextId("delegation") : nextId("client"),
        created_at: consentHarness.nowIso,
        updated_at: consentHarness.nowIso,
        granted_at:
          this.table === "agent_delegations" ? consentHarness.nowIso : undefined,
        revoked_at: null,
        ...this.payload,
      };
      this.rows().push(row);
      return { data: pickColumns(row, this.columns), error: null };
    }

    const found = this.rows().find((row) => matches(row, this.filters));
    if (this.op === "update") {
      if (!found) {
        return requireRow
          ? { data: null, error: { message: "not found" } }
          : { data: null, error: null };
      }
      Object.assign(found, this.payload);
      return { data: pickColumns(found, this.columns), error: null };
    }
    if (!found) {
      return requireRow
        ? { data: null, error: { message: "not found" } }
        : { data: null, error: null };
    }
    return { data: pickColumns(found, this.columns), error: null };
  }

  executeList() {
    consentHarness.operations.push({
      table: this.table,
      op: this.op,
      payload: this.payload ? { ...this.payload } : null,
    });
    const rows = this.rows().filter((row) => matches(row, this.filters));
    if (this.orderColumn) {
      rows.sort((a, b) => {
        const av = String(a[this.orderColumn] ?? "");
        const bv = String(b[this.orderColumn] ?? "");
        return this.orderAscending ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return {
      data: rows.map((row) => pickColumns(row, this.columns)),
      error: null,
    };
  }
}

export function createMockConsentClient() {
  return {
    from(table) {
      return new TableQuery(table);
    },
  };
}
