import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { pushPathForEvent } from "../push/message.ts";
import {
  loadConversationForViewer,
  resolveOwnedConversation,
  toTranscriptResponse,
  type Viewer,
} from "./view.ts";

type Row = Record<string, unknown>;

const CONVERSATION = "ff788ff2-d2f1-4534-92d0-e9eb81bad028";
const OTHER_CONVERSATION = "11111111-1111-4111-8111-111111111111";
const REQUEST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_REQUEST = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CLIENT = "client-user";
const SPECIALIST = "55b177ab-d62b-4c65-aa6c-384dad91709e";
const SPECIALIST_USER = "specialist-user";
const OTHER_SPECIALIST = "66666666-6666-4666-8666-666666666666";

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
      order() {
        return api;
      },
      maybeSingle: async () => ({ data: matched()[0] ? { ...matched()[0] } : null, error: null }),
      then(resolve: (value: { data: Row[]; error: null }) => void) {
        resolve({ data: matched().map((row) => ({ ...row })), error: null });
      },
    };
    return api;
  }
  return { from } as unknown as SupabaseClient;
}

function seed() {
  return memory({
    conversations: [
      {
        id: CONVERSATION,
        service_request_id: REQUEST,
        specialist_id: SPECIALIST,
        client_user_id: CLIENT,
        status: "open",
      },
      {
        id: OTHER_CONVERSATION,
        service_request_id: OTHER_REQUEST,
        specialist_id: OTHER_SPECIALIST,
        client_user_id: "other-client",
        status: "open",
      },
    ],
    service_requests: [
      {
        id: REQUEST,
        public_id: "REQ-20260928-8MMQHF",
        client_user_id: CLIENT,
        client_email: "hidden@example.test",
        client_phone: "+491511234567",
        requested_service: "коуч",
        category_text: "коуч",
      },
      {
        id: OTHER_REQUEST,
        public_id: "REQ-20260928-OTHER1",
        client_user_id: "other-client",
        requested_service: "чужая",
      },
    ],
    conversation_messages: [
      {
        id: "m-late",
        conversation_id: CONVERSATION,
        kind: "text",
        actor_type: "specialist",
        author_user_id: SPECIALIST_USER,
        body: "Тест2",
        created_at: "2026-09-28T18:05:00.000Z",
        payload: {},
      },
      {
        id: "m-system",
        conversation_id: CONVERSATION,
        kind: "system",
        actor_type: "system",
        author_user_id: null,
        body: null,
        created_at: "2026-09-28T18:00:00.000Z",
        payload: { event: "connection_ready", service_label: "коуч", client_email: "hidden@example.test" },
      },
      {
        id: "m-early",
        conversation_id: CONVERSATION,
        kind: "text",
        actor_type: "client",
        author_user_id: CLIENT,
        body: "Otvet",
        created_at: "2026-09-28T18:02:00.000Z",
        payload: {},
      },
    ],
  });
}

const clientViewer: Viewer = { actorUserId: CLIENT, actorSpecialistId: null, anonymousRequestId: null };
const specialistViewer: Viewer = {
  actorUserId: SPECIALIST_USER,
  actorSpecialistId: SPECIALIST,
  anonymousRequestId: null,
};

test("client and selected specialist can read one chronological transcript without contacts", async () => {
  const supabase = seed();
  const client = await loadConversationForViewer(supabase, { conversationId: CONVERSATION, viewer: clientViewer });
  const specialist = await loadConversationForViewer(supabase, { conversationId: CONVERSATION, viewer: specialistViewer });
  assert.equal(client?.role, "client");
  assert.equal(specialist?.role, "specialist");
  const response = toTranscriptResponse(client!);
  assert.deepEqual(
    response.messages.map((message) => message.id),
    ["m-system", "m-early", "m-late"],
  );
  assert.equal(response.messages[1].body, "Otvet");
  assert.equal(response.messages[2].body, "Тест2");
  assert.equal(response.messages[0].body, null);
  assert.deepEqual(response.messages[0].system_payload, { event: "connection_ready", service_label: "коуч" });
  assert.equal(response.public_id, "REQ-20260928-8MMQHF");
  assert.equal(response.conversation_id, CONVERSATION);
  const serialized = JSON.stringify(response);
  assert.equal(serialized.includes("author_user_id"), false);
  assert.equal(serialized.includes("hidden@example.test"), false);
  assert.equal(serialized.includes("+491511234567"), false);
  assert.equal(serialized.includes("client_phone"), false);
  assert.equal(serialized.includes("client_email"), false);
});

test("unrelated users and another specialist cannot read or resolve the conversation", async () => {
  const supabase = seed();
  assert.equal(
    await loadConversationForViewer(supabase, {
      conversationId: CONVERSATION,
      viewer: { actorUserId: null, actorSpecialistId: null, anonymousRequestId: null },
    }),
    null,
  );
  assert.equal(
    await loadConversationForViewer(supabase, {
      conversationId: CONVERSATION,
      viewer: { actorUserId: "stranger", actorSpecialistId: null, anonymousRequestId: null },
    }),
    null,
  );
  assert.equal(
    await loadConversationForViewer(supabase, {
      conversationId: CONVERSATION,
      viewer: { actorUserId: "other-specialist-user", actorSpecialistId: OTHER_SPECIALIST, anonymousRequestId: null },
    }),
    null,
  );
  const own = await resolveOwnedConversation(supabase, { publicId: "REQ-20260928-8MMQHF", viewer: clientViewer });
  assert.equal(own.status, "ready");
  if (own.status === "ready") assert.equal(own.conversationId, CONVERSATION);
  const other = await resolveOwnedConversation(supabase, {
    publicId: "REQ-20260928-8MMQHF",
    viewer: { actorUserId: "other-client", actorSpecialistId: null, anonymousRequestId: null },
  });
  assert.equal(other.status, "forbidden");
  const second = await resolveOwnedConversation(supabase, {
    publicId: "REQ-20260928-OTHER1",
    viewer: { actorUserId: "other-client", actorSpecialistId: null, anonymousRequestId: null },
  });
  assert.equal(second.status, "ready");
  if (second.status === "ready") assert.equal(second.conversationId, OTHER_CONVERSATION);
  const none = await resolveOwnedConversation(supabase, {
    publicId: "REQ-20260928-NONE01",
    viewer: clientViewer,
  });
  assert.equal(none.status, "absent");
});

test("message routes authorize the session viewer and keep connection_ready navigation", () => {
  const messages = readFileSync(new URL("../../app/api/conversations/[id]/messages/route.ts", import.meta.url), "utf8");
  const resolver = readFileSync(new URL("../../app/api/requests/[publicId]/conversation/route.ts", import.meta.url), "utf8");
  const delivery = readFileSync(new URL("../inbox/delivery.ts", import.meta.url), "utf8");
  assert.match(messages, /export async function GET/);
  assert.match(messages, /loadConversationForViewer/);
  assert.match(messages, /toTranscriptResponse/);
  assert.equal(messages.includes("searchParams"), false);
  assert.equal(messages.includes("recipient_user_id"), false);
  assert.equal(messages.includes("client_user_id"), false);
  assert.match(messages, /deliverOutboxById/);
  assert.match(messages, /ok: true, id: posted\.id/);
  assert.match(resolver, /resolveOwnedConversation/);
  assert.equal(resolver.includes("searchParams"), false);
  assert.match(delivery, /\.order\("next_attempt_at", \{ ascending: true \}\)/);
  assert.match(delivery, /\.order\("created_at", \{ ascending: true \}\)/);
  assert.equal(
    pushPathForEvent({ locale: "ua", eventType: "connection_ready", publicId: "REQ-20260928-8MMQHF" }),
    "/ua/requests/REQ-20260928-8MMQHF/conversation",
  );
});
