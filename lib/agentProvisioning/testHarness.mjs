const NOW_ISO = "2026-09-21T18:00:00.000Z";

export const provisioningHarness = {
  nowIso: NOW_ISO,
  clients: [],
  credentials: [],
  deleteCalls: [],
  operations: [],
  credentialInsertFailuresRemaining: 0,
  lastCredentialInsert: null,
  generateCalls: 0,
};

let rowSeq = 0;

function nextId(kind) {
  rowSeq += 1;
  const n = String(rowSeq).padStart(12, "0");
  if (kind === "client") return `11111111-1111-4111-8111-${n}`;
  return `22222222-2222-4222-8222-${n}`;
}

export function resetProvisioningHarness() {
  provisioningHarness.nowIso = NOW_ISO;
  provisioningHarness.clients = [];
  provisioningHarness.credentials = [];
  provisioningHarness.deleteCalls = [];
  provisioningHarness.operations = [];
  provisioningHarness.credentialInsertFailuresRemaining = 0;
  provisioningHarness.lastCredentialInsert = null;
  provisioningHarness.generateCalls = 0;
  rowSeq = 0;
}

function pickColumns(row, columns) {
  if (!columns || columns === "*") return { ...row };
  const keys = columns.split(",").map((key) => key.trim());
  const picked = {};
  for (const key of keys) picked[key] = row[key] ?? null;
  return picked;
}

function matches(row, filters) {
  return Object.entries(filters).every(([key, value]) => row[key] === value);
}

class TableQuery {
  constructor(table) {
    this.table = table;
    this.op = "select";
    this.payload = null;
    this.filters = {};
    this.columns = "*";
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

  delete() {
    provisioningHarness.deleteCalls.push({ table: this.table });
    this.op = "delete";
    return this;
  }

  async single() {
    return this.execute(true);
  }

  async maybeSingle() {
    return this.execute(false);
  }

  execute(requireRow) {
    provisioningHarness.operations.push({
      table: this.table,
      op: this.op,
      payload: this.payload ? { ...this.payload } : null,
    });

    if (this.op === "delete") {
      return { data: null, error: { message: "delete is not allowed" } };
    }

    if (this.table === "agent_clients") return this.executeClients(requireRow);
    if (this.table === "agent_credentials") {
      return this.executeCredentials(requireRow);
    }
    return { data: null, error: { message: `unknown table ${this.table}` } };
  }

  executeClients(requireRow) {
    if (this.op === "insert") {
      const row = {
        id: nextId("client"),
        created_at: provisioningHarness.nowIso,
        updated_at: provisioningHarness.nowIso,
        ...this.payload,
      };
      provisioningHarness.clients.push(row);
      return { data: pickColumns(row, this.columns), error: null };
    }

    const found = provisioningHarness.clients.find((row) =>
      matches(row, this.filters),
    );
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

  executeCredentials(requireRow) {
    if (this.op === "insert") {
      provisioningHarness.lastCredentialInsert = { ...this.payload };
      if (provisioningHarness.credentialInsertFailuresRemaining > 0) {
        provisioningHarness.credentialInsertFailuresRemaining -= 1;
        return { data: null, error: { code: "23505", message: "duplicate" } };
      }
      const duplicate = provisioningHarness.credentials.some(
        (row) =>
          row.key_prefix === this.payload.key_prefix ||
          row.credential_hash === this.payload.credential_hash,
      );
      if (duplicate) {
        return { data: null, error: { code: "23505", message: "duplicate" } };
      }
      const row = {
        id: nextId("cred"),
        created_at: provisioningHarness.nowIso,
        revoked_at: null,
        expires_at: this.payload.expires_at ?? null,
        ...this.payload,
      };
      provisioningHarness.credentials.push(row);
      return { data: pickColumns(row, this.columns), error: null };
    }

    const found = provisioningHarness.credentials.find((row) =>
      matches(row, this.filters),
    );
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
}

export function createMockProvisioningClient() {
  return {
    from(table) {
      return new TableQuery(table);
    },
  };
}
