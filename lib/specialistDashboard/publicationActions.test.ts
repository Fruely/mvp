import assert from "node:assert/strict";
import test from "node:test";

import { isPublishedSpecialistStatus } from "./publicationStatus.ts";
import { publishSpecialistProfile } from "./publishSpecialist.ts";
import { unpublishSpecialistProfile } from "./unpublishSpecialist.ts";

const SPECIALIST_ID = "11111111-1111-1111-1111-111111111111";
const CATEGORY_ID = "22222222-2222-2222-2222-222222222222";

type SpecialistState = {
  id: string;
  slug: string | null;
  status: string;
  name: string;
  category_id: string;
  languages: string[];
  work_format: "online";
  postal_code: string;
  country_code: string;
  lat: number;
  lng: number;
  service_radius_km: number | null;
  is_active: boolean;
  is_visible: boolean;
  published_at: string | null;
};

function createReadyDraftState(): SpecialistState {
  return {
    id: SPECIALIST_ID,
    slug: null,
    status: "draft",
    name: "Smoke Specialist",
    category_id: CATEGORY_ID,
    languages: ["ru"],
    work_format: "online",
    postal_code: "10115",
    country_code: "DE",
    lat: 52.52,
    lng: 13.405,
    service_radius_km: null,
    is_active: false,
    is_visible: false,
    published_at: null,
  };
}

function createPublishMockSupabase(specialist: SpecialistState, services: Array<Record<string, unknown>>) {
  let updatePayload: Record<string, unknown> | null = null;
  let lastEqColumn: string | null = null;
  const category = { id: CATEGORY_ID, parent_id: "parent-id", slug: "psychologists" };

  const chain: Record<string, unknown> = {};
  let table = "specialists";
  const self = () => chain;
  chain.select = self;
  chain.eq = (column: string, _value: unknown) => {
    lastEqColumn = column;
    return self();
  };
  chain.not = self;
  chain.ilike = self;
  chain.update = (payload: Record<string, unknown>) => {
    updatePayload = payload;
    return chain;
  };
  chain.insert = async () => ({ error: null });
  chain.upsert = async () => ({ error: null });
  chain.rpc = async () => ({ error: null });
  chain.maybeSingle = async () => {
    if (updatePayload) {
      if (isPublishedSpecialistStatus(specialist.status)) {
        return { data: null, error: null };
      }
      Object.assign(specialist, updatePayload);
      updatePayload = null;
      return { data: { id: SPECIALIST_ID, status: specialist.status }, error: null };
    }
    if (table === "specialists" && lastEqColumn === "slug") {
      return { data: null, error: null };
    }
    if (table === "specialists") {
      return { data: { ...specialist }, error: null };
    }
    if (table === "categories") return { data: { ...category }, error: null };
    if (table === "specialist_services") return { data: services, error: null };
    if (table === "specialist_profiles") return { data: { city: "Berlin" }, error: null };
    if (table === "specialist_plan") return { data: null, error: null };
    if (table === "cities") return { data: { slug: "berlin" }, error: null };
    return { data: null, error: null };
  };

  return {
    specialist,
    service: {
      from(name: string) {
        table = name;
        lastEqColumn = null;
        return chain;
      },
    },
  };
}

test("isPublishedSpecialistStatus recognizes published_unverified", () => {
  assert.equal(isPublishedSpecialistStatus("published_unverified"), true);
  assert.equal(isPublishedSpecialistStatus("draft"), false);
});

test("publishSpecialistProfile is idempotent for published_unverified", async () => {
  const specialist = createReadyDraftState();
  specialist.status = "published_unverified";
  const { service } = createPublishMockSupabase(specialist, []);

  const result = await publishSpecialistProfile(service as never, SPECIALIST_ID, {
    notifyNewSpecialist: async () => {},
    assignFounderBadge: async () => {},
    reconcileLifecycle: async () => {},
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.alreadyPublished, true);
    assert.equal(result.status, "published_unverified");
  }
});

test("publishSpecialistProfile rejects incomplete profile without services", async () => {
  const specialist = createReadyDraftState();
  const { service } = createPublishMockSupabase(specialist, []);

  const result = await publishSpecialistProfile(service as never, SPECIALIST_ID, {
    notifyNewSpecialist: async () => {},
    assignFounderBadge: async () => {},
    reconcileLifecycle: async () => {},
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 400);
    assert.equal(result.body.code, "services_required");
  }
});

test("unpublishSpecialistProfile reverts published_unverified to private draft baseline", async () => {
  const specialist = createReadyDraftState();
  specialist.status = "published_unverified";
  specialist.slug = "psychologists-berlin-smoke";
  specialist.is_active = true;
  specialist.is_visible = true;
  specialist.published_at = "2026-01-01T00:00:00.000Z";

  let updatePayload: Record<string, unknown> | null = null;
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = self;
  chain.eq = self;
  chain.update = (payload: Record<string, unknown>) => {
    updatePayload = payload;
    return chain;
  };
  chain.maybeSingle = async () => {
    if (updatePayload) {
      Object.assign(specialist, updatePayload);
      return {
        data: {
          id: SPECIALIST_ID,
          status: specialist.status,
          is_active: specialist.is_active,
          is_visible: specialist.is_visible,
          published_at: specialist.published_at,
          slug: specialist.slug,
        },
        error: null,
      };
    }
    return { data: { id: SPECIALIST_ID, status: specialist.status }, error: null };
  };

  const result = await unpublishSpecialistProfile({ from: () => chain } as never, SPECIALIST_ID);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.status, "draft");
  assert.equal(specialist.status, "draft");
  assert.equal(specialist.is_active, false);
  assert.equal(specialist.is_visible, false);
  assert.equal(specialist.published_at, null);
  assert.equal(specialist.slug, null);
});

test("unpublishSpecialistProfile is idempotent for draft", async () => {
  const specialist = createReadyDraftState();
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = self;
  chain.eq = self;
  chain.maybeSingle = async () => ({
    data: { id: SPECIALIST_ID, status: specialist.status },
    error: null,
  });

  const result = await unpublishSpecialistProfile({ from: () => chain } as never, SPECIALIST_ID);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.alreadyPrivate, true);
    assert.equal(result.status, "draft");
  }
});

test("unpublishSpecialistProfile protects moderated statuses", async () => {
  for (const status of ["featured_verified", "approved", "paused"] as const) {
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    chain.select = self;
    chain.eq = self;
    chain.maybeSingle = async () => ({
      data: { id: SPECIALIST_ID, status },
      error: null,
    });
    const result = await unpublishSpecialistProfile({ from: () => chain } as never, SPECIALIST_ID);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 409);
      assert.equal(result.body.code, "unpublish_not_allowed");
    }
  }
});
