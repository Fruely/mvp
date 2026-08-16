import assert from "node:assert/strict";
import test from "node:test";

import { buildClientIdempotencyFingerprint } from "../mutations/clientIdempotency.ts";
import {
  createSpecialistService,
  deleteSpecialistService,
  updateSpecialistService,
} from "./mutateService.ts";
import {
  hasDisplayableServicePrice,
  isValidActiveServiceForPublication,
  normalizeNumber,
} from "./validation.ts";

const SPECIALIST_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";
const CATEGORY_ID = "33333333-3333-3333-3333-333333333333";
const SERVICE_ID = "44444444-4444-4444-4444-444444444444";

type MockState = {
  services: Record<string, unknown>[];
  categories: Record<string, unknown>[];
  inserts: Record<string, unknown>[];
  updates: Record<string, unknown>[];
};

function createMockSupabase(state: MockState) {
  let currentTable = "specialist_services";
  let filterId: string | undefined;
  let filterSpecialistId: string | undefined;
  let filterKey: string | undefined;

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
    const row = { id: SERVICE_ID, created_at: "2026-01-01", updated_at: "2026-01-01", ...data };
    state.services.push(row);
    (chain as { _inserted?: Record<string, unknown> })._inserted = row;
    return chain;
  };
  chain.delete = self;
  chain.upsert = () => chain;
  chain.maybeSingle = async () => {
    if (currentTable === "categories") {
      return { data: state.categories[0] ?? null, error: null };
    }
    if (currentTable === "specialist_services") {
      if (filterKey) {
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

test("normalizeNumber accepts comma decimal input", () => {
  assert.equal(normalizeNumber("49,90"), 49.9);
});

test("zero price requires price_comment for displayable price", () => {
  assert.equal(hasDisplayableServicePrice(0, "по договорённости"), true);
  assert.equal(hasDisplayableServicePrice(0, null), false);
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
