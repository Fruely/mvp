import { registerPartnerTestHooks } from "../partners/partnerTestHooks.mjs";

registerPartnerTestHooks();

import assert from "node:assert/strict";
import test from "node:test";

const { buildClientIdempotencyFingerprint } = await import("../mutations/clientIdempotency.ts");
const {
  createSpecialistService,
  deleteSpecialistService,
  updateSpecialistService,
} = await import("./mutateService.ts");
const {
  isValidActiveServiceForPublication,
  normalizeNumber,
  ACTIVE_PRICE_REQUIRED_ERROR,
  PRICING_EXCEPTION_EXPLANATION_REQUIRED_ERROR,
  PRICING_EXCEPTION_INVALID_ERROR,
} = await import("./validation.ts");

const SPECIALIST_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";
const CATEGORY_ID = "33333333-3333-3333-3333-333333333333";
const SERVICE_ID = "44444444-4444-4444-4444-444444444444";

type MockState = {
  services: Record<string, unknown>[];
  categories: Record<string, unknown>[];
  inserts: Record<string, unknown>[];
  updates: Record<string, unknown>[];
  insertUniqueViolation?: boolean;
  idempotencyLookupError?: boolean;
  /** Row that wins a concurrent INSERT race — visible only after failed insert lookup. */
  raceWinnerRow?: Record<string, unknown>;
  idempotencyLookupCount?: number;
};

function createMockSupabase(state: MockState) {
  let currentTable = "specialist_services";
  let filterId: string | undefined;
  let filterSpecialistId: string | undefined;
  let filterKey: string | undefined;
  let pendingInsert = false;

  const nextIdempotencyLookup = () => {
    state.idempotencyLookupCount = (state.idempotencyLookupCount ?? 0) + 1;
    return state.idempotencyLookupCount;
  };

  const self = () => chain;
  const chain: Record<string, unknown> = {};

  chain.select = self;
  chain.eq = (col: string, val: unknown) => {
    if (col === "id") filterId = String(val);
    if (col === "specialist_id") filterSpecialistId = String(val);
    if (col === "client_idempotency_key") filterKey = String(val);
    return chain;
  };
  chain.order = self;
  chain.update = (data: Record<string, unknown>) => {
    state.updates.push(data);
    const row = state.services.find(
      (item) =>
        String(item.id) === filterId &&
        (!filterSpecialistId || String(item.specialist_id) === filterSpecialistId),
    );
    if (row) Object.assign(row, data);
    return chain;
  };
  chain.insert = (data: Record<string, unknown>) => {
    state.inserts.push(data);
    pendingInsert = true;
    if (!state.insertUniqueViolation) {
      const row = { id: SERVICE_ID, created_at: "2026-01-01", updated_at: "2026-01-01", ...data };
      state.services.push(row);
      (chain as { _inserted?: Record<string, unknown> })._inserted = row;
    }
    return chain;
  };
  chain.delete = self;
  chain.upsert = () => chain;
  chain.maybeSingle = async () => {
    if (pendingInsert && state.insertUniqueViolation) {
      pendingInsert = false;
      return { data: null, error: { code: "23505", message: "duplicate key value" } };
    }
    pendingInsert = false;

    if (currentTable === "categories") {
      return { data: state.categories[0] ?? null, error: null };
    }
    if (currentTable === "specialist_services") {
      if (filterKey) {
        const lookupCount = nextIdempotencyLookup();
        if (state.idempotencyLookupError && lookupCount >= 2) {
          return { data: null, error: { message: "lookup failed" } };
        }
        if (state.raceWinnerRow) {
          if (lookupCount === 1) {
            return { data: null, error: null };
          }
          return { data: state.raceWinnerRow, error: null };
        }
        const row = state.services.find((item) => item.client_idempotency_key === filterKey);
        return { data: row ?? null, error: null };
      }
      const row = state.services.find((item) => {
        if (filterId && String(item.id) !== filterId) return false;
        if (filterSpecialistId && String(item.specialist_id) !== filterSpecialistId) return false;
        return true;
      });
      return {
        data: row ?? (chain as { _inserted?: Record<string, unknown> })._inserted ?? null,
        error: null,
      };
    }
    return { data: null, error: null };
  };
  chain.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve({ data: [...state.services], error: null }).then(onFulfilled);

  return {
    from(table: string) {
      currentTable = table;
      filterId = undefined;
      filterSpecialistId = undefined;
      filterKey = undefined;
      delete (chain as { _inserted?: Record<string, unknown> })._inserted;
      return chain;
    },
  };
}

const okCtx = (supabase: ReturnType<typeof createMockSupabase>) => ({
  kind: "ok" as const,
  supabase: supabase as never,
  userId: USER_ID,
  specialistId: SPECIALIST_ID,
  categoryId: CATEGORY_ID,
  specialistStatus: "draft",
});

const stubReadiness = async () => ({
  onboarding_gate: "incomplete" as const,
  publication_ready: false,
  public_profile_available: false,
});

const IDEMPOTENCY_KEY = "native:service:abc12345";
const OTHER_USER_ID = "99999999-9999-9999-9999-999999999999";

function buildFingerprint(priceFrom = 25) {
  return buildClientIdempotencyFingerprint({
    title: "Math tutoring",
    description: null,
    price_comment: null,
    pricing_exception: null,
    pricing_type: "fixed",
    price_from: priceFrom,
    price_to: null,
    currency: "EUR",
    duration_minutes: null,
    is_active: true,
    category_id: CATEGORY_ID,
  });
}

function existingIdempotentRow(args: {
  fingerprint: string;
  ownerUserId?: string;
  title?: string;
}) {
  return {
    id: SERVICE_ID,
    specialist_id: SPECIALIST_ID,
    title: args.title ?? "Math tutoring",
    description: null,
    price_comment: null,
    pricing_exception: null,
    pricing_type: "fixed",
    price_from: 25,
    price_to: null,
    currency: "EUR",
    duration_minutes: null,
    is_active: true,
    category_id: CATEGORY_ID,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    client_idempotency_key: IDEMPOTENCY_KEY,
    client_idempotency_fingerprint: args.fingerprint,
    owner_user_id: args.ownerUserId ?? USER_ID,
  };
}

async function createWithIdempotency(state: MockState, body: Record<string, unknown>) {
  return createSpecialistService(
    okCtx(createMockSupabase(state)),
    {
      title: "Math tutoring",
      pricing_type: "fixed",
      price_from: 25,
      is_active: true,
      idempotency_key: IDEMPOTENCY_KEY,
      ...body,
    },
    "de",
    { loadReadiness: stubReadiness },
  );
}

test("normalizeNumber accepts comma decimal input", () => {
  assert.equal(normalizeNumber("49,90"), 49.9);
});

test("comment alone does not make a zero price publishable", () => {
  assert.equal(
    isValidActiveServiceForPublication(
      {
        is_active: true,
        category_id: CATEGORY_ID,
        title: "Jobcenter service",
        pricing_type: "fixed",
        price_from: 0,
        price_comment: "по договорённости",
      },
      CATEGORY_ID,
    ),
    false,
  );
});

test("publication counts only active services in profile category", () => {
  assert.equal(
    isValidActiveServiceForPublication(
      {
        is_active: true,
        category_id: CATEGORY_ID,
        title: "Math tutoring",
        pricing_type: "fixed",
        price_from: 25,
      },
      CATEGORY_ID,
    ),
    true,
  );
  assert.equal(
    isValidActiveServiceForPublication(
      {
        is_active: true,
        category_id: "other-category",
        title: "Math tutoring",
        pricing_type: "fixed",
        price_from: 25,
      },
      CATEGORY_ID,
    ),
    false,
  );
});

test("create assigns specialist category and EUR currency", async () => {
  const state: MockState = {
    services: [],
    categories: [{ id: CATEGORY_ID, parent_id: "parent", slug: "math" }],
    inserts: [],
    updates: [],
  };

  const result = await createSpecialistService(
    okCtx(createMockSupabase(state)),
    {
      title: "Math tutoring",
      pricing_type: "fixed",
      price_from: 25,
      is_active: true,
    },
    "de",
    { loadReadiness: stubReadiness },
  );

  assert.equal(result.ok, true);
  assert.equal(state.inserts[0]?.category_id, CATEGORY_ID);
  assert.equal(state.inserts[0]?.currency, "EUR");
  assert.equal(state.inserts[0]?.specialist_id, SPECIALIST_ID);
});

test("create idempotency key replays without duplicate insert", async () => {
  const payload = {
    specialist_id: SPECIALIST_ID,
    title: "Math tutoring",
    description: null,
    price_comment: null,
    pricing_type: "fixed",
    price_from: 25,
    price_to: null,
    currency: "EUR",
    duration_minutes: null,
    is_active: true,
    category_id: CATEGORY_ID,
  };
  const fingerprint = buildClientIdempotencyFingerprint({
    title: payload.title,
    description: payload.description,
    price_comment: payload.price_comment,
    pricing_exception: null,
    pricing_type: payload.pricing_type,
    price_from: payload.price_from,
    price_to: payload.price_to,
    currency: payload.currency,
    duration_minutes: payload.duration_minutes,
    is_active: payload.is_active,
    category_id: payload.category_id,
  });

  const state: MockState = {
    services: [
      {
        id: SERVICE_ID,
        specialist_id: SPECIALIST_ID,
        title: "Math tutoring",
        description: null,
        price_comment: null,
        pricing_type: "fixed",
        price_from: 25,
        price_to: null,
        currency: "EUR",
        duration_minutes: null,
        is_active: true,
        category_id: CATEGORY_ID,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
        client_idempotency_key: "native:service:abc12345",
        client_idempotency_fingerprint: fingerprint,
        owner_user_id: USER_ID,
      },
    ],
    categories: [{ id: CATEGORY_ID, parent_id: "parent", slug: "math" }],
    inserts: [],
    updates: [],
  };

  const result = await createSpecialistService(
    okCtx(createMockSupabase(state)),
    {
      title: "Math tutoring",
      pricing_type: "fixed",
      price_from: 25,
      is_active: true,
      idempotency_key: "native:service:abc12345",
    },
    "de",
    { loadReadiness: stubReadiness },
  );

  assert.equal(result.ok, true);
  assert.equal(state.inserts.length, 0);
});

test("pre-insert fingerprint conflict returns 409", async () => {
  const fingerprint = buildFingerprint();
  const state: MockState = {
    services: [existingIdempotentRow({ fingerprint: buildFingerprint(99) })],
    categories: [{ id: CATEGORY_ID, parent_id: "parent", slug: "math" }],
    inserts: [],
    updates: [],
  };

  const result = await createWithIdempotency(state, {});
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 409);
    assert.equal(result.body.error, "Idempotency key reused with different payload");
  }
});

test("pre-insert ownership conflict returns 409 without leaking DTO", async () => {
  const fingerprint = buildFingerprint();
  const state: MockState = {
    services: [existingIdempotentRow({ fingerprint, ownerUserId: OTHER_USER_ID, title: "Secret" })],
    categories: [{ id: CATEGORY_ID, parent_id: "parent", slug: "math" }],
    inserts: [],
    updates: [],
  };

  const result = await createWithIdempotency(state, {});
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 409);
    assert.match(String(result.body.error), /auth context/i);
    assert.equal((result.body as { data?: unknown }).data, undefined);
  }
});

test("UNIQUE race replay returns 200 without duplicate insert", async () => {
  const fingerprint = buildFingerprint();
  const state: MockState = {
    services: [],
    categories: [{ id: CATEGORY_ID, parent_id: "parent", slug: "math" }],
    inserts: [],
    updates: [],
    insertUniqueViolation: true,
    raceWinnerRow: existingIdempotentRow({ fingerprint }),
  };

  const result = await createWithIdempotency(state, {});
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.status, 200);
  assert.equal(state.inserts.length, 1);
  assert.equal(state.services.length, 0);
});

test("UNIQUE race fingerprint conflict returns 409 not 500", async () => {
  const state: MockState = {
    services: [],
    categories: [{ id: CATEGORY_ID, parent_id: "parent", slug: "math" }],
    inserts: [],
    updates: [],
    insertUniqueViolation: true,
    raceWinnerRow: existingIdempotentRow({ fingerprint: buildFingerprint(99) }),
  };

  const result = await createWithIdempotency(state, {});
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 409);
    assert.equal(result.body.error, "Idempotency key reused with different payload");
  }
});

test("UNIQUE race ownership conflict returns 409 not 500", async () => {
  const fingerprint = buildFingerprint();
  const state: MockState = {
    services: [],
    categories: [{ id: CATEGORY_ID, parent_id: "parent", slug: "math" }],
    inserts: [],
    updates: [],
    insertUniqueViolation: true,
    raceWinnerRow: existingIdempotentRow({
      fingerprint,
      ownerUserId: OTHER_USER_ID,
      title: "Secret",
    }),
  };

  const result = await createWithIdempotency(state, {});
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 409);
    assert.match(String(result.body.error), /auth context/i);
    assert.equal((result.body as { data?: unknown }).data, undefined);
  }
});

test("UNIQUE race replay lookup error returns 500", async () => {
  const fingerprint = buildFingerprint();
  const state: MockState = {
    services: [],
    categories: [{ id: CATEGORY_ID, parent_id: "parent", slug: "math" }],
    inserts: [],
    updates: [],
    insertUniqueViolation: true,
    idempotencyLookupError: true,
    raceWinnerRow: existingIdempotentRow({ fingerprint }),
  };

  const result = await createWithIdempotency(state, {});
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 500);
});

test("pre-insert and UNIQUE-race idempotency semantics match", async () => {
  const fingerprint = buildFingerprint();
  const mismatchFingerprint = buildFingerprint(99);

  const cases = [
    {
      name: "replay",
      row: existingIdempotentRow({ fingerprint }),
      expectOk: true,
      expectStatus: 200,
    },
    {
      name: "fingerprint conflict",
      row: existingIdempotentRow({ fingerprint: mismatchFingerprint }),
      expectOk: false,
      expectStatus: 409,
      expectError: "Idempotency key reused with different payload",
    },
    {
      name: "ownership conflict",
      row: existingIdempotentRow({ fingerprint, ownerUserId: OTHER_USER_ID, title: "Secret" }),
      expectOk: false,
      expectStatus: 409,
      expectError: /auth context/i,
    },
  ] as const;

  for (const scenario of cases) {
    const preInsert = await createWithIdempotency(
      {
        services: [scenario.row],
        categories: [{ id: CATEGORY_ID, parent_id: "parent", slug: "math" }],
        inserts: [],
        updates: [],
      },
      {},
    );

    const postRace = await createWithIdempotency(
      {
        services: [],
        categories: [{ id: CATEGORY_ID, parent_id: "parent", slug: "math" }],
        inserts: [],
        updates: [],
        insertUniqueViolation: true,
        raceWinnerRow: scenario.row,
      },
      {},
    );

    assert.equal(preInsert.ok, scenario.expectOk, `${scenario.name} pre-insert ok`);
    assert.equal(postRace.ok, scenario.expectOk, `${scenario.name} post-race ok`);
    if (scenario.expectOk) {
      if (preInsert.ok) assert.equal(preInsert.status, scenario.expectStatus, `${scenario.name} pre-insert status`);
      if (postRace.ok) assert.equal(postRace.status, scenario.expectStatus, `${scenario.name} post-race status`);
    } else {
      if (!preInsert.ok) {
        assert.equal(preInsert.status, scenario.expectStatus, `${scenario.name} pre-insert status`);
        if ("expectError" in scenario && scenario.expectError instanceof RegExp) {
          assert.match(String(preInsert.body.error), scenario.expectError, `${scenario.name} pre-insert error`);
        } else if ("expectError" in scenario) {
          assert.equal(preInsert.body.error, scenario.expectError, `${scenario.name} pre-insert error`);
        }
      }
      if (!postRace.ok) {
        assert.equal(postRace.status, scenario.expectStatus, `${scenario.name} post-race status`);
        if ("expectError" in scenario && scenario.expectError instanceof RegExp) {
          assert.match(String(postRace.body.error), scenario.expectError, `${scenario.name} post-race error`);
        } else if ("expectError" in scenario) {
          assert.equal(postRace.body.error, scenario.expectError, `${scenario.name} post-race error`);
        }
      }
    }
  }
});

test("update rejects cross-owner service lookup as not found", async () => {
  const state: MockState = {
    services: [
      {
        id: SERVICE_ID,
        specialist_id: "other-specialist",
        title: "Other",
        pricing_type: "fixed",
        price_from: 10,
        price_to: null,
        price_comment: null,
        is_active: true,
        category_id: CATEGORY_ID,
      },
    ],
    categories: [],
    inserts: [],
    updates: [],
  };

  const result = await updateSpecialistService(
    okCtx(createMockSupabase(state)),
    { id: SERVICE_ID, title: "Updated" },
    "de",
    { loadReadiness: stubReadiness },
  );

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 404);
});

test("delete succeeds for owned draft specialist service", async () => {
  const state: MockState = {
    services: [
      {
        id: SERVICE_ID,
        specialist_id: SPECIALIST_ID,
        title: "Math",
        pricing_type: "fixed",
        price_from: 25,
        price_to: null,
        price_comment: null,
        is_active: true,
        category_id: CATEGORY_ID,
      },
    ],
    categories: [],
    inserts: [],
    updates: [],
  };

  const result = await deleteSpecialistService(
    okCtx(createMockSupabase(state)),
    { id: SERVICE_ID },
    "de",
    { loadReadiness: stubReadiness },
  );

  assert.equal(result.ok, true);
});

function emptyState(): MockState {
  return {
    services: [],
    categories: [{ id: CATEGORY_ID, parent_id: "parent", slug: "math" }],
    inserts: [],
    updates: [],
  };
}

test("create A: positive price without exception is valid", async () => {
  const state = emptyState();
  const result = await createSpecialistService(
    okCtx(createMockSupabase(state)),
    { title: "Consult", pricing_type: "fixed", price_from: 50, is_active: true },
    "de",
    { loadReadiness: stubReadiness },
  );
  assert.equal(result.ok, true);
  assert.equal(state.inserts[0]?.price_from, 50);
  assert.equal(state.inserts[0]?.pricing_exception, null);
});

test("create B: zero without exception is invalid for active service", async () => {
  const result = await createSpecialistService(
    okCtx(createMockSupabase(emptyState())),
    { title: "Consult", pricing_type: "fixed", price_from: 0, is_active: true },
    "de",
    { loadReadiness: stubReadiness },
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.body.error, ACTIVE_PRICE_REQUIRED_ERROR);
});

test("create C: missing price without exception is invalid for active service", async () => {
  const result = await createSpecialistService(
    okCtx(createMockSupabase(emptyState())),
    { title: "Consult", pricing_type: "fixed", is_active: true },
    "de",
    { loadReadiness: stubReadiness },
  );
  assert.equal(result.ok, false);
});

test("create D: funded exception plus explanation is valid without numeric price", async () => {
  const state = emptyState();
  const result = await createSpecialistService(
    okCtx(createMockSupabase(state)),
    {
      title: "Jobcenter coaching",
      pricing_type: "fixed",
      pricing_exception: "THIRD_PARTY_FUNDED",
      price_comment: "Оплата через Jobcenter",
      is_active: true,
    },
    "de",
    { loadReadiness: stubReadiness },
  );
  assert.equal(result.ok, true);
  assert.equal(state.inserts[0]?.price_from, 0);
  assert.equal(state.inserts[0]?.pricing_exception, "THIRD_PARTY_FUNDED");
  assert.equal(state.inserts[0]?.is_active, true);
});

test("create E: after-assessment exception plus explanation is valid", async () => {
  const state = emptyState();
  const result = await createSpecialistService(
    okCtx(createMockSupabase(state)),
    {
      title: "Inspection",
      pricing_type: "fixed",
      pricing_exception: "AFTER_ASSESSMENT",
      price_comment: "Preis nach Besichtigung",
      is_active: true,
    },
    "de",
    { loadReadiness: stubReadiness },
  );
  assert.equal(result.ok, true);
  assert.equal(state.inserts[0]?.pricing_exception, "AFTER_ASSESSMENT");
});

test("create F: exception without explanation is invalid", async () => {
  const result = await createSpecialistService(
    okCtx(createMockSupabase(emptyState())),
    {
      title: "Inspection",
      pricing_type: "fixed",
      pricing_exception: "AFTER_ASSESSMENT",
      price_comment: "   ",
      is_active: true,
    },
    "de",
    { loadReadiness: stubReadiness },
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.body.error, PRICING_EXCEPTION_EXPLANATION_REQUIRED_ERROR);
});

test("create G: positive price plus optional explanation is valid", async () => {
  const state = emptyState();
  const result = await createSpecialistService(
    okCtx(createMockSupabase(state)),
    {
      title: "Consult",
      pricing_type: "fixed",
      price_from: 80,
      price_comment: "inkl. Anfahrt",
      is_active: true,
    },
    "de",
    { loadReadiness: stubReadiness },
  );
  assert.equal(result.ok, true);
  assert.equal(state.inserts[0]?.price_comment, "inkl. Anfahrt");
});

test("create rejects unsupported pricing exception values", async () => {
  const result = await createSpecialistService(
    okCtx(createMockSupabase(emptyState())),
    {
      title: "Consult",
      pricing_type: "fixed",
      pricing_exception: "BY_AGREEMENT",
      price_comment: "по договорённости",
      is_active: true,
    },
    "de",
    { loadReadiness: stubReadiness },
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.body.error, PRICING_EXCEPTION_INVALID_ERROR);
});

test("update uses the same canonical pricing validator as create", async () => {
  const state: MockState = {
    services: [
      {
        id: SERVICE_ID,
        specialist_id: SPECIALIST_ID,
        title: "Consult",
        pricing_type: "fixed",
        price_from: 50,
        price_to: null,
        price_comment: null,
        pricing_exception: null,
        is_active: true,
        category_id: CATEGORY_ID,
      },
    ],
    categories: [{ id: CATEGORY_ID, parent_id: "parent", slug: "math" }],
    inserts: [],
    updates: [],
  };

  const invalid = await updateSpecialistService(
    okCtx(createMockSupabase(state)),
    { id: SERVICE_ID, price_from: 0, is_active: true },
    "de",
    { loadReadiness: stubReadiness },
  );
  assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.equal(invalid.body.error, ACTIVE_PRICE_REQUIRED_ERROR);

  const valid = await updateSpecialistService(
    okCtx(createMockSupabase(state)),
    {
      id: SERVICE_ID,
      price_from: 0,
      pricing_exception: "THIRD_PARTY_FUNDED",
      price_comment: "Jobcenter trägt die Kosten",
      is_active: true,
    },
    "de",
    { loadReadiness: stubReadiness },
  );
  assert.equal(valid.ok, true);
  assert.equal(state.updates.at(-1)?.pricing_exception, "THIRD_PARTY_FUNDED");
  assert.equal(state.updates.at(-1)?.price_from, 0);
});

test("route wiring uses specialistServices modules", async () => {
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const route = await readFile(
    fileURLToPath(new URL("../../app/api/specialist/services/route.ts", import.meta.url)),
    "utf8",
  );
  assert.match(route, /resolveSpecialistServicesContext/);
  assert.match(route, /createSpecialistService/);
  assert.match(route, /loadSpecialistServicesPage/);
});
