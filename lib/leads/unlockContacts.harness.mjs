/** Shared mutable state for unlock-contacts route tests (no live DB/email). */
export const harness = {
  authUser: null,
  authError: null,
  specialists: [],
  leads: [],
  emailCalls: [],
  specialistLookupError: null,
  leadFetchError: null,
  leadUpdateError: null,
  refetchError: null,
  /** When true, update always returns 0 rows (race simulation). */
  forceUpdateMiss: false,
  /** After first lead select, mark row unlocked before subsequent selects. */
  simulateConcurrentUnlock: false,
  concurrentUnlockTimestamp: null,
  concurrentUnlockBy: null,
  leadSelectCount: 0,
};

export function resetHarness() {
  harness.authUser = null;
  harness.authError = null;
  harness.specialists = [];
  harness.leads = [];
  harness.emailCalls = [];
  harness.specialistLookupError = null;
  harness.leadFetchError = null;
  harness.leadUpdateError = null;
  harness.refetchError = null;
  harness.forceUpdateMiss = false;
  harness.simulateConcurrentUnlock = false;
  harness.concurrentUnlockTimestamp = null;
  harness.concurrentUnlockBy = null;
  harness.leadSelectCount = 0;
}

class Query {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.operation = "select";
    this.selectColumns = "*";
    this.payload = null;
    this.isFilters = [];
  }

  select(columns) {
    this.selectColumns = columns;
    return this;
  }

  eq(column, value) {
    this.filters.push({ type: "eq", column, value });
    return this;
  }

  is(column, value) {
    this.isFilters.push({ column, value });
    return this;
  }

  update(payload) {
    this.operation = "update";
    this.payload = payload;
    return this;
  }

  filteredRows() {
    const tableRows = harness[this.table] ?? [];
    return tableRows.filter((row) => {
      for (const filter of this.filters) {
        if (row[filter.column] !== filter.value) return false;
      }
      for (const filter of this.isFilters) {
        if (filter.value === null && row[filter.column] != null) return false;
        if (filter.value !== null && row[filter.column] !== filter.value) return false;
      }
      return true;
    });
  }

  async maybeSingle() {
    if (this.table === "specialists" && harness.specialistLookupError) {
      return { data: null, error: harness.specialistLookupError };
    }
    if (this.table === "leads" && this.operation === "select" && harness.leadFetchError) {
      return { data: null, error: harness.leadFetchError };
    }
    if (this.table === "leads" && this.operation === "update" && harness.leadUpdateError) {
      return { data: null, error: harness.leadUpdateError };
    }
    if (this.table === "leads" && this.operation === "update" && harness.refetchError) {
      return { data: null, error: null };
    }

    if (this.operation === "update") {
      if (this.table === "leads" && harness.forceUpdateMiss) {
        return { data: null, error: null };
      }
      const matches = this.filteredRows();
      const row = matches[0];
      if (!row) {
        return { data: null, error: null };
      }
      Object.assign(row, this.payload);
      return { data: { ...row }, error: null };
    }

    if (this.table === "leads" && this.operation === "select") {
      harness.leadSelectCount += 1;
      if (
        harness.simulateConcurrentUnlock &&
        harness.leadSelectCount > 1 &&
        harness.concurrentUnlockTimestamp
      ) {
        const live = this.filteredRows()[0];
        if (live && live.contact_unlocked_at == null) {
          live.contact_unlocked_at = harness.concurrentUnlockTimestamp;
          live.contact_unlocked_by = harness.concurrentUnlockBy ?? "other-user-id";
        }
      }
    }

    const row = this.filteredRows()[0] ?? null;
    return { data: row ? { ...row } : null, error: null };
  }
}

export function createMockAuthClient() {
  return {
    auth: {
      getUser: async () => ({
        data: { user: harness.authUser },
        error: harness.authError,
      }),
    },
  };
}

export function createMockServiceClient() {
  return {
    from(table) {
      return new Query(table);
    },
  };
}
