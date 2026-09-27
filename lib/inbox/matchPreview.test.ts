import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  MATCH_PREVIEW_REQUEST_COLUMNS,
  listOwnedActiveMatchPreviews,
  readOwnedMatchPreview,
} from "./matchPreview.ts";
import {
  specialistLeadSessionErrorCode,
  specialistLeadSessionErrorStatus,
} from "../specialistLeads/session.ts";

type Row = Record<string, unknown>;

const OWN = "specialist-1";
const OTHER = "specialist-2";
const USER = "user-1";
const MATCH = "11111111-1111-4111-8111-111111111111";
const FOREIGN = "22222222-2222-4222-8222-222222222222";
const REQUEST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function requestRow(overrides: Row = {}): Row {
  return {
    id: REQUEST,
    requested_service: "психолог",
    category_text: "Психологи",
    description: "Потрібен онлайн психолог українською мовою, бюджет до 50 євро",
    city: "Berlin",
    postal_code: "10115",
    work_format: "online",
    service_languages: ["uk"],
    client_budget_text: "до 50 євро",
    created_at: "2026-09-27T16:00:00.000Z",
    service_timing_type: "flexible_period",
    service_timing_date: null,
    service_timing_time: null,
    service_timing_date_end: null,
    service_timing_period: "flexible",
    service_timing_note: null,
    client_name: "Hidden",
    client_email: "hidden@example.test",
    client_phone: "+491511234567",
    ...overrides,
  };
}

function memory(seed: Record<string, Row[]>) {
  const tables: Record<string, Row[]> = {};
  for (const [name, rows] of Object.entries(seed)) {
    tables[name] = rows.map((row) => ({ ...row }));
  }
  const updates: Array<{ table: string; patch: Row }> = [];
  function from(table: string) {
    const filters: Array<(row: Row) => boolean> = [];
    let patch: Row | null = null;
    const rows = () => (tables[table] ?? []).filter((row) => filters.every((filter) => filter(row)));
    const apply = async () => {
      if (patch) {
        updates.push({ table, patch });
        for (const row of rows()) Object.assign(row, patch);
      }
      return { data: rows().map((row) => ({ ...row })), error: null };
    };
    const api = {
      select() {
        return api;
      },
      eq(column: string, value: unknown) {
        filters.push((row) => row[column] === value);
        return api;
      },
      in(column: string, values: unknown[]) {
        filters.push((row) => values.includes(row[column]));
        return api;
      },
      is(column: string, value: unknown) {
        filters.push((row) => (value === null ? row[column] == null : row[column] === value));
        return api;
      },
      order() {
        return api;
      },
      limit() {
        return api;
      },
      update(next: Row) {
        patch = next;
        return api;
      },
      maybeSingle: async () => {
        const result = await apply();
        return { data: result.data[0] ?? null, error: null };
      },
      then(resolve: (value: { data: Row[]; error: null }) => void, reject?: (reason: unknown) => void) {
        return apply().then(resolve, reject);
      },
    };
    return api;
  }
  return { supabase: { from } as unknown as SupabaseClient, tables, updates };
}

function seed(requestOverrides: Row = {}) {
  return memory({
    service_request_matches: [
      {
        id: MATCH,
        specialist_id: OWN,
        service_request_id: REQUEST,
        status: "active",
        opened_at: null,
        matched_at: "2026-09-27T16:05:00.000Z",
      },
      {
        id: FOREIGN,
        specialist_id: OTHER,
        service_request_id: REQUEST,
        status: "active",
        opened_at: null,
        matched_at: "2026-09-27T16:06:00.000Z",
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        specialist_id: OWN,
        service_request_id: REQUEST,
        status: "declined",
        opened_at: null,
        matched_at: "2026-09-27T16:07:00.000Z",
      },
    ],
    service_requests: [requestRow(requestOverrides)],
    inbox_items: [
      {
        id: "inbox-1",
        entity_id: MATCH,
        recipient_user_id: USER,
        read_at: null,
        opened_at: null,
      },
    ],
  });
}

test("owning specialist receives the safe demand preview and open marks it read", async () => {
  const db = seed();
  const result = await readOwnedMatchPreview(db.supabase, {
    matchId: MATCH,
    specialistId: OWN,
    userId: USER,
  });
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(result.preview.match_id, MATCH);
  assert.equal(result.preview.service_request_id, REQUEST);
  assert.equal(result.preview.match_status, "active");
  assert.equal(result.preview.service_label, "психолог");
  assert.equal(result.preview.description, "Потрібен онлайн психолог українською мовою, бюджет до 50 євро");
  assert.equal(result.preview.work_format, "online");
  assert.deepEqual(result.preview.service_languages, ["uk"]);
  assert.equal(result.preview.client_budget_text, "до 50 євро");
  assert.equal(result.preview.city, "Berlin");
  assert.equal(result.preview.postal_code, "10115");
  assert.equal(result.preview.timing, null);
  assert.equal(result.preview.opened, true);
  assert.equal(typeof db.tables.service_request_matches[0].opened_at, "string");
  assert.equal(typeof db.tables.inbox_items[0].read_at, "string");
  assert.equal(typeof db.tables.inbox_items[0].opened_at, "string");
  const serialized = JSON.stringify(result.preview);
  assert.equal(serialized.includes("client_name"), false);
  assert.equal(serialized.includes("client_email"), false);
  assert.equal(serialized.includes("client_phone"), false);
  assert.equal(serialized.includes("Hidden"), false);
  assert.equal(serialized.includes("hidden@example.test"), false);
});

test("another specialist's match id is forbidden and does not open the row", async () => {
  const db = seed();
  const result = await readOwnedMatchPreview(db.supabase, {
    matchId: MATCH,
    specialistId: OTHER,
    userId: "user-2",
  });
  assert.deepEqual(result, { status: "forbidden" });
  assert.equal(db.tables.service_request_matches[0].opened_at, null);
  assert.equal(db.updates.length, 0);
});

test("a missing match id is not found", async () => {
  const db = seed();
  const result = await readOwnedMatchPreview(db.supabase, {
    matchId: "99999999-9999-4999-8999-999999999999",
    specialistId: OWN,
    userId: USER,
  });
  assert.deepEqual(result, { status: "not_found" });
});

test("absent and blocked specialists are rejected by the existing session helper", () => {
  assert.equal(specialistLeadSessionErrorStatus({ kind: "specialist_required" }), 403);
  assert.equal(specialistLeadSessionErrorCode({ kind: "specialist_required" }), "specialist_required");
  assert.equal(specialistLeadSessionErrorStatus({ kind: "forbidden_blocked" }), 403);
  assert.equal(specialistLeadSessionErrorCode({ kind: "forbidden_blocked" }), "forbidden");
  const detail = readFileSync(new URL("../../app/api/specialist/matches/[matchId]/route.ts", import.meta.url), "utf8");
  const list = readFileSync(new URL("../../app/api/specialist/matches/route.ts", import.meta.url), "utf8");
  for (const source of [detail, list]) {
    assert.match(source, /resolveSpecialistLeadSession/);
    assert.equal(source.includes("client_email"), false);
    assert.equal(source.includes("client_phone"), false);
    assert.equal(source.includes("client_name"), false);
  }
  assert.match(detail, /readOwnedMatchPreview/);
});

test("explicit timing is preserved and a generic flexible result stays hidden", async () => {
  const tomorrow = seed({
    service_timing_type: "date_flexible",
    service_timing_date: "2026-09-28",
    service_timing_note: "завтра",
  });
  const stated = await readOwnedMatchPreview(tomorrow.supabase, {
    matchId: MATCH,
    specialistId: OWN,
    userId: USER,
  });
  assert.equal(stated.status, "ready");
  if (stated.status === "ready") {
    assert.equal(stated.preview.timing?.service_timing_type, "date_flexible");
    assert.equal(stated.preview.timing?.service_timing_date, "2026-09-28");
    assert.equal(stated.preview.timing?.service_timing_note, "завтра");
  }

  const nextWeek = seed({
    service_timing_type: "flexible_period",
    service_timing_period: "next_week",
    service_timing_note: null,
  });
  const period = await readOwnedMatchPreview(nextWeek.supabase, {
    matchId: MATCH,
    specialistId: OWN,
    userId: USER,
  });
  assert.equal(period.status, "ready");
  if (period.status === "ready") {
    assert.equal(period.preview.timing?.service_timing_period, "next_week");
  }
});

test("an empty budget stays empty and the select list has no contact columns", () => {
  assert.equal(MATCH_PREVIEW_REQUEST_COLUMNS.includes("client_budget_text"), true);
  assert.equal(MATCH_PREVIEW_REQUEST_COLUMNS.includes("description"), true);
  assert.equal(MATCH_PREVIEW_REQUEST_COLUMNS.includes("client_email"), false);
  assert.equal(MATCH_PREVIEW_REQUEST_COLUMNS.includes("client_phone"), false);
  assert.equal(MATCH_PREVIEW_REQUEST_COLUMNS.includes("client_name"), false);
});

test("the current-match list contains only this specialist's active demand", async () => {
  const db = seed({ client_budget_text: null });
  const result = await listOwnedActiveMatchPreviews(db.supabase, OWN);
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.deepEqual(result.items.map((item) => item.match_id), [MATCH]);
  assert.equal(result.items[0].client_budget_text, null);
  assert.equal(result.items[0].description?.includes("психолог"), true);
  assert.equal(JSON.stringify(result.items).includes("hidden@example.test"), false);
  assert.equal(db.updates.length, 0);

  const foreign = await listOwnedActiveMatchPreviews(db.supabase, OTHER);
  assert.equal(foreign.status, "ready");
  if (foreign.status === "ready") {
    assert.deepEqual(foreign.items.map((item) => item.match_id), [FOREIGN]);
  }
});
