import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { buildLockScreenPush, pushHasPrivateContent, pushPathForEvent } from "../push/message.ts";
import { buildExpoPushRequest } from "../push/transport.ts";
import {
  conversationMessagePayload,
  recordConversationMessage,
  resolveConversationMessageRecipient,
  shouldNotifyUserMessage,
} from "./conversationNotice.ts";
import { postConversationText } from "./messages.ts";
import { loadConversationForViewer } from "./view.ts";

type Row = Record<string, unknown>;

const CONVERSATION = "ff788ff2-d2f1-4534-92d0-e9eb81bad028";
const REQUEST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MESSAGE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CLIENT = "client-user";
const SPECIALIST = "specialist-a";
const SPECIALIST_USER = "specialist-user";
const BODY = "Проверка";
const EMAIL = "hidden@example.test";
const PHONE = "+491511234567";

function memory(seed: Record<string, Row[]>) {
  const tables: Record<string, Row[]> = {};
  for (const [name, rows] of Object.entries(seed)) tables[name] = rows.map((row) => ({ ...row }));
  const ensure = (name: string) => {
    if (!tables[name]) tables[name] = [];
    return tables[name];
  };
  function from(table: string) {
    const filters: Array<(row: Row) => boolean> = [];
    const matched = () => ensure(table).filter((row) => filters.every((filter) => filter(row)));
    const api = {
      select() {
        return api;
      },
      eq(column: string, value: unknown) {
        filters.push((row) => row[column] === value);
        return api;
      },
      is(column: string, value: unknown) {
        filters.push((row) => (value === null ? row[column] == null : row[column] === value));
        return api;
      },
      limit() {
        return api;
      },
      insert(row: Row) {
        const stored = { id: crypto.randomUUID(), ...row };
        ensure(table).push(stored);
        return {
          select() {
            return { maybeSingle: async () => ({ data: { ...stored }, error: null }) };
          },
        };
      },
      upsert(payload: Row, options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
        const conflict = options?.onConflict;
        const existing = conflict ? ensure(table).find((row) => row[conflict] === payload[conflict]) : undefined;
        let stored: Row | null = null;
        if (existing && options?.ignoreDuplicates) stored = null;
        else if (existing) {
          Object.assign(existing, payload);
          stored = existing;
        } else {
          stored = { id: crypto.randomUUID(), ...payload };
          ensure(table).push(stored);
        }
        return {
          select() {
            return { maybeSingle: async () => ({ data: stored ? { ...stored } : null, error: null }) };
          },
        };
      },
      maybeSingle: async () => ({ data: matched()[0] ?? null, error: null }),
      then(resolve: (value: { data: Row[]; error: null }) => void) {
        resolve({ data: matched().map((row) => ({ ...row })), error: null });
      },
    };
    return api;
  }
  return { supabase: { from } as unknown as SupabaseClient, tables };
}

function seed(options?: { push?: boolean }) {
  return memory({
    conversations: [
      {
        id: CONVERSATION,
        service_request_id: REQUEST,
        specialist_id: SPECIALIST,
        client_user_id: CLIENT,
        status: "open",
      },
    ],
    service_requests: [
      {
        id: REQUEST,
        public_id: "REQ-20260928-8MMQHF",
        client_user_id: CLIENT,
        client_email: EMAIL,
        client_phone: PHONE,
        requested_service: "коуч",
        category_text: "коуч",
        locale: "ru",
      },
    ],
    specialists: [{ id: SPECIALIST, user_id: SPECIALIST_USER, notification_locale: "ru" }],
    conversation_messages: [],
    inbox_items: [],
    notification_outbox: [],
    notification_preferences: [],
    push_endpoints: options?.push
      ? [{ id: "endpoint-1", user_id: CLIENT, enabled: true, invalidated_at: null, token: "ExponentPushToken[ready]" }]
      : [],
  });
}

test("specialist text creates one client inbox item and a push when the client is ready", async () => {
  const db = seed({ push: true });
  const posted = await postConversationText(db.supabase, {
    conversationId: CONVERSATION,
    actor: "specialist",
    authorUserId: SPECIALIST_USER,
    body: BODY,
  });
  assert.equal("id" in posted, true);
  const notices = db.tables.inbox_items.filter((row) => row.type === "conversation_message");
  assert.equal(notices.length, 1);
  assert.equal(notices[0].recipient_user_id, CLIENT);
  assert.notEqual(notices[0].recipient_user_id, SPECIALIST_USER);
  const push = db.tables.notification_outbox.filter((row) => row.channel === "push");
  assert.equal(push.length, 1);
  assert.equal(push[0].status, "pending");
  assert.equal(push[0].recipient_user_id, CLIENT);
  assert.equal(db.tables.notification_outbox.some((row) => row.channel === "email" || row.channel === "telegram"), false);
});

test("client text notifies the specialist and never the author", async () => {
  const db = seed();
  db.tables.push_endpoints.push({
    id: "endpoint-2",
    user_id: SPECIALIST_USER,
    enabled: true,
    invalidated_at: null,
    token: "ExponentPushToken[specialist]",
  });
  await recordConversationMessage(db.supabase, {
    conversationId: CONVERSATION,
    messageId: MESSAGE,
    kind: "text",
    actor: "client",
    authorUserId: CLIENT,
  });
  assert.equal(db.tables.inbox_items.length, 1);
  assert.equal(db.tables.inbox_items[0].recipient_user_id, SPECIALIST_USER);
  assert.notEqual(db.tables.inbox_items[0].recipient_user_id, CLIENT);
  assert.equal(db.tables.notification_outbox[0].status, "pending");
});

test("replaying the same message does not create a second notice", async () => {
  const db = seed({ push: true });
  const input = {
    conversationId: CONVERSATION,
    messageId: MESSAGE,
    kind: "text" as const,
    actor: "specialist" as const,
    authorUserId: SPECIALIST_USER,
  };
  await recordConversationMessage(db.supabase, input);
  await recordConversationMessage(db.supabase, input);
  assert.equal(db.tables.inbox_items.length, 1);
  assert.equal(db.tables.notification_outbox.length, 1);
});

test("a system message does not create a conversation_message notice", async () => {
  const db = seed({ push: true });
  assert.equal(shouldNotifyUserMessage({ kind: "system", actor: "system" }), false);
  await recordConversationMessage(db.supabase, {
    conversationId: CONVERSATION,
    messageId: MESSAGE,
    kind: "system",
    actor: "system",
    authorUserId: null,
  });
  assert.equal(db.tables.inbox_items.length, 0);
  assert.equal(db.tables.notification_outbox.length, 0);
  assert.equal(shouldNotifyUserMessage({ kind: "audio", actor: "client" }), true);
});

test("missing push endpoint still creates the inbox and skips push", async () => {
  const db = seed();
  await recordConversationMessage(db.supabase, {
    conversationId: CONVERSATION,
    messageId: MESSAGE,
    kind: "text",
    actor: "specialist",
    authorUserId: SPECIALIST_USER,
  });
  assert.equal(db.tables.inbox_items.length, 1);
  assert.equal(db.tables.notification_outbox[0].status, "skipped");
  assert.equal(db.tables.notification_outbox[0].last_error_code, "push_not_configured");
});

test("push copy and payload omit the message body and contact data", () => {
  const payload = conversationMessagePayload({
    conversationId: CONVERSATION,
    serviceRequestId: REQUEST,
    publicId: "REQ-20260928-8MMQHF",
  });
  const message = buildLockScreenPush({
    locale: "ru",
    eventType: "conversation_message",
    entityId: CONVERSATION,
    deepLink: "https://freuly.de/ru/requests/REQ-20260928-8MMQHF/conversation",
    serviceLabel: "коуч",
  });
  const request = buildExpoPushRequest({ ...message, conversationId: CONVERSATION }, "ExponentPushToken[ready]");
  const serialized = JSON.stringify({ payload, message, data: request.data });
  assert.equal(serialized.includes(BODY), false);
  assert.equal(serialized.includes(EMAIL), false);
  assert.equal(serialized.includes(PHONE), false);
  assert.equal(pushHasPrivateContent(message, BODY), false);
  assert.equal(message.title, "Новое сообщение в Freuly");
  assert.match(message.body, /коуч/);
  assert.equal(request.data.eventType, "conversation_message");
  assert.equal(request.data.conversationId, CONVERSATION);
});

test("message taps open the existing client and specialist conversations", () => {
  assert.equal(
    pushPathForEvent({
      locale: "ua",
      eventType: "conversation_message",
      publicId: "REQ-20260928-8MMQHF",
      conversationId: CONVERSATION,
      side: "client",
    }),
    "/ua/requests/REQ-20260928-8MMQHF/conversation",
  );
  assert.equal(
    pushPathForEvent({
      locale: "de",
      eventType: "conversation_message",
      conversationId: CONVERSATION,
      side: "specialist",
    }),
    `/de/specialist/dashboard/conversations/${CONVERSATION}`,
  );
  assert.equal(
    pushPathForEvent({ locale: "ua", eventType: "connection_ready", publicId: "REQ-20260928-8MMQHF" }),
    "/ua/requests/REQ-20260928-8MMQHF/conversation",
  );
});

test("unauthenticated and non-participant viewers cannot read the conversation to send", async () => {
  const db = seed();
  const route = readFileSync(new URL("../../app/api/conversations/[id]/messages/route.ts", import.meta.url), "utf8");
  assert.equal(route.includes("recipient_user_id"), false);
  assert.match(route, /loadConversationForViewer/);
  assert.equal(
    await loadConversationForViewer(db.supabase, {
      conversationId: CONVERSATION,
      viewer: { actorUserId: null, actorSpecialistId: null, anonymousRequestId: null },
    }),
    null,
  );
  assert.equal(
    await loadConversationForViewer(db.supabase, {
      conversationId: CONVERSATION,
      viewer: { actorUserId: "other-user", actorSpecialistId: "other-specialist", anonymousRequestId: null },
    }),
    null,
  );
  const participant = await loadConversationForViewer(db.supabase, {
    conversationId: CONVERSATION,
    viewer: { actorUserId: SPECIALIST_USER, actorSpecialistId: SPECIALIST, anonymousRequestId: null },
  });
  assert.equal(participant?.role, "specialist");
});

test("inconsistent conversation ownership does not notify either participant", () => {
  assert.deepEqual(
    resolveConversationMessageRecipient({
      actor: "specialist",
      authorUserId: SPECIALIST_USER,
      conversationClientUserId: "other-client",
      requestClientUserId: CLIENT,
      conversationSpecialistId: SPECIALIST,
      specialistId: SPECIALIST,
      specialistUserId: SPECIALIST_USER,
    }),
    { error: "inconsistent" },
  );
  assert.deepEqual(
    resolveConversationMessageRecipient({
      actor: "client",
      authorUserId: CLIENT,
      conversationClientUserId: CLIENT,
      requestClientUserId: CLIENT,
      conversationSpecialistId: SPECIALIST,
      specialistId: SPECIALIST,
      specialistUserId: CLIENT,
    }),
    { error: "inconsistent" },
  );
});
