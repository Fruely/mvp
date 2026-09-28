import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { specialistLeadSessionErrorStatus } from "../specialistLeads/session.ts";
import {
  listOwnedSpecialistConversations,
  specialistConversationHasPrivateContact,
} from "./specialistConversations.ts";

type Row = Record<string, unknown>;

const OWN = "55b177ab-d62b-4c65-aa6c-384dad91709e";
const OTHER = "66666666-6666-4666-8666-666666666666";
const REQUEST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_REQUEST = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const OPEN_REQUEST = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const CONVERSATION = "ff788ff2-d2f1-4534-92d0-e9eb81bad028";
const NEWER = "11111111-1111-4111-8111-111111111111";

function memory(seed: Record<string, Row[]>) {
  const tables: Record<string, Row[]> = {};
  for (const [name, rows] of Object.entries(seed)) tables[name] = rows.map((row) => ({ ...row }));
  function from(table: string) {
    const filters: Array<(row: Row) => boolean> = [];
    const matched = () => (tables[table] ?? []).filter((row) => filters.every((filter) => filter(row)));
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
      order() {
        return api;
      },
      limit() {
        return api;
      },
      then(resolve: (value: { data: Row[]; error: null }) => void) {
        resolve({ data: matched().map((row) => ({ ...row })), error: null });
      },
    };
    return api;
  }
  return { supabase: { from } as unknown as SupabaseClient, tables };
}

function seed() {
  return memory({
    conversations: [
      {
        id: CONVERSATION,
        service_request_id: REQUEST,
        specialist_id: OWN,
        client_user_id: "client-user",
        status: "open",
        created_at: "2026-09-28T12:00:00.000Z",
      },
      {
        id: NEWER,
        service_request_id: OTHER_REQUEST,
        specialist_id: OWN,
        client_user_id: "client-user",
        status: "open",
        created_at: "2026-09-28T11:00:00.000Z",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        service_request_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        specialist_id: OTHER,
        status: "open",
        created_at: "2026-09-28T18:00:00.000Z",
      },
    ],
    service_requests: [
      {
        id: REQUEST,
        public_id: "REQ-20260928-8MMQHF",
        status: "matched",
        selected_specialist_id: OWN,
        requested_service: "коуч",
        category_text: "коуч",
        client_budget_text: "50 €",
        client_name: "Hidden",
        client_email: "hidden@example.test",
        client_phone: "+491511234567",
      },
      {
        id: OTHER_REQUEST,
        public_id: "REQ-20260928-NEWER1",
        status: "matched",
        selected_specialist_id: OWN,
        requested_service: "электрик",
        client_budget_text: null,
      },
      {
        id: OPEN_REQUEST,
        public_id: "REQ-20260928-OPEN01",
        status: "new",
        selected_specialist_id: null,
        requested_service: "ещё не взята",
      },
      {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        public_id: "REQ-20260928-OTHER1",
        status: "matched",
        selected_specialist_id: OTHER,
        requested_service: "чужая",
        client_email: "other@example.test",
      },
    ],
    service_request_matches: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        specialist_id: OWN,
        service_request_id: OPEN_REQUEST,
        status: "active",
      },
    ],
    conversation_messages: [
      {
        id: "44444444-4444-4444-8444-444444444444",
        conversation_id: CONVERSATION,
        kind: "text",
        body: "Проверка",
        created_at: "2026-09-28T12:30:00.000Z",
      },
      {
        id: "55555555-5555-4555-8555-555555555555",
        conversation_id: NEWER,
        kind: "text",
        body: "секрет клиента",
        created_at: "2026-09-28T13:00:00.000Z",
      },
    ],
    leads: [{ id: "lead-1", specialist_id: OWN, status: "accepted", client_email: "lead@example.test" }],
  });
}

test("a specialist sees only owned claimed conversations, without contacts", async () => {
  const db = seed();
  const result = await listOwnedSpecialistConversations(db.supabase, OWN);
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.deepEqual(
    result.items.map((item) => item.conversation_id),
    [NEWER, CONVERSATION],
  );
  const claimed = result.items.find((item) => item.conversation_id === CONVERSATION);
  assert.equal(claimed?.public_id, "REQ-20260928-8MMQHF");
  assert.equal(claimed?.service_label, "коуч");
  assert.equal(claimed?.request_status, "matched");
  assert.equal(claimed?.client_budget_text, "50 €");
  assert.equal(claimed?.latest_message_kind, "text");
  assert.equal(result.items.some((item) => item.service_request_id === OPEN_REQUEST), false);
  assert.equal(result.items.some((item) => item.public_id === "REQ-20260928-OTHER1"), false);
  const serialized = JSON.stringify(result.items);
  assert.equal(serialized.includes("hidden@example.test"), false);
  assert.equal(serialized.includes("+491511234567"), false);
  assert.equal(serialized.includes("Hidden"), false);
  assert.equal(serialized.includes("Проверка"), false);
  assert.equal(serialized.includes("секрет клиента"), false);
  assert.equal(serialized.includes("lead@example.test"), false);
  assert.equal(specialistConversationHasPrivateContact(result.items), false);
});

test("newest message activity is listed before an older conversation", async () => {
  const db = seed();
  const result = await listOwnedSpecialistConversations(db.supabase, OWN);
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(result.items[0]?.conversation_id, NEWER);
  assert.equal(result.items[0]?.latest_message_at, "2026-09-28T13:00:00.000Z");
  assert.equal(result.items[1]?.conversation_created_at, "2026-09-28T12:00:00.000Z");
});

test("the conversations route uses the session specialist and rejects anonymous callers", () => {
  const route = readFileSync(new URL("../../app/api/specialist/conversations/route.ts", import.meta.url), "utf8");
  assert.match(route, /resolveSpecialistLeadSession/);
  assert.match(route, /session\.specialistId/);
  assert.equal(route.includes("searchParams"), false);
  assert.equal(route.includes("request.json"), false);
  assert.equal(specialistLeadSessionErrorStatus({ kind: "unauthorized" }), 401);
  const leads = readFileSync(new URL("../specialistLeads/service.ts", import.meta.url), "utf8");
  assert.match(leads, /\.from\("leads"\)/);
  assert.equal(leads.includes("conversations"), false);
});
