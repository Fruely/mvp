import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deliverOutboxById, deliverPendingOutbox, enqueueMatchNotifications } from "@/lib/inbox/delivery";
import { postConversationText } from "@/lib/selection/messages";
import { DEFAULT_MATCH_DELIVERY_POLICY, externalDeliveryDecision, notificationLocale, planExternalChannels, quietHoursDeferralApplies, stageInitialChannels } from "@/lib/inbox/policy";
import { buildLockScreenPush, httpsDeepLink, pushHasPrivateContent, pushPathForEvent } from "./message";
import { applyTransportPreferences, aggregatePushStatuses, pushPriority, resolveRecipientTimeZone } from "./policy";
import { listOwnPushEndpoints, registerPushEndpoint, unregisterPushEndpoint } from "./endpoints";
import { saveNotificationPreferences } from "./preferences";
import { recordPushTap } from "./tap";
import { hashPushToken, pushLogRecord } from "./token";
import { isRecipientPushReady } from "./readiness";
import { buildExpoPushRequest, classifyPushProviderError, createExpoPushTransport, type PushTransport } from "./transport";
import { deliverPushFanout } from "./deliver";

type Row = Record<string, unknown>;

function memory(seed: Record<string, Row[]>) {
  const tables: Record<string, Row[]> = {};
  Object.keys(seed).forEach((name) => {
    tables[name] = seed[name].map((row) => ({ ...row }));
  });
  const ensure = (name: string) => {
    if (!tables[name]) tables[name] = [];
    return tables[name];
  };
  function from(table: string) {
    const filters: Array<(row: Row) => boolean> = [];
    let patch: Row | null = null;
    let limitN = 100;
    const matched = () => ensure(table).filter((row) => filters.every((filter) => filter(row))).slice(0, limitN);
    const api = {
      select() { return api; },
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
      lte(column: string, value: unknown) {
        filters.push((row) => String(row[column]) <= String(value));
        return api;
      },
      like(column: string, pattern: string) {
        const needle = pattern.replace(/%/g, "");
        filters.push((row) => String(row[column] ?? "").includes(needle));
        return api;
      },
      order() { return api; },
      limit(value: number) { limitN = value; return api; },
      maybeSingle: async () => {
        const rows = matched();
        if (patch && rows[0]) Object.assign(rows[0], patch);
        return { data: rows[0] ? { ...rows[0] } : null, error: null };
      },
      insert(row: Row) {
        const stored = { id: crypto.randomUUID(), ...row };
        ensure(table).push(stored);
        return {
          select() {
            return { maybeSingle: async () => ({ data: { ...stored }, error: null }) };
          },
          then(resolve: (value: { data: Row; error: null }) => void) {
            resolve({ data: stored, error: null });
          },
        };
      },
      upsert(payload: Row, options?: { onConflict?: string }) {
        const conflict = options?.onConflict;
        const existing = conflict ? ensure(table).find((row) => row[conflict] === payload[conflict]) : undefined;
        let stored: Row;
        if (existing) {
          Object.assign(existing, payload);
          stored = existing;
        } else {
          stored = { id: crypto.randomUUID(), ...payload };
          ensure(table).push(stored);
        }
        return {
          select() {
            return { maybeSingle: async () => ({ data: { ...stored }, error: null }) };
          },
          then(resolve: (value: { error: null }) => void) { resolve({ error: null }); },
        };
      },
      update(next: Row) { patch = next; return api; },
      then(resolve: (value: { data: Row[]; error: null }) => void) {
        const rows = matched();
        if (patch) rows.forEach((row) => Object.assign(row, patch));
        resolve({ data: rows.map((row) => ({ ...row })), error: null });
      },
    };
    return api;
  }
  return { supabase: { from } as unknown as SupabaseClient, tables };
}

const TOKEN_A = "ExponentPushToken[aaaaaaaaaaaa]";
const TOKEN_B = "ExponentPushToken[bbbbbbbbbbbb]";
const TOKEN_C = "ExponentPushToken[cccccccccccc]";

function base() {
  return memory({
    push_endpoints: [],
    notification_preferences: [],
    inbox_items: [],
    notification_outbox: [],
    notification_delivery_attempts: [],
    service_request_matches: [{
      id: "match-1",
      specialist_id: "specialist-1",
      service_request_id: "request-1",
      status: "active",
      opened_at: null,
      responded_at: null,
      matched_at: "2026-01-15T10:00:00.000Z",
    }],
    specialists: [{
      id: "specialist-1",
      user_id: "user-1",
      email: "specialist@example.com",
      telegram_chat_id: 100,
      notification_locale: "de",
    }],
    service_requests: [{
      id: "request-1",
      public_id: "REQ-1",
      client_user_id: "user-client",
      locale: "ua",
      client_email: "client@example.com",
      client_phone: "+49111222333",
      requested_service: "Tax advice",
      city: "Berlin",
      work_format: "offline",
      service_languages: ["ru"],
    }],
  });
}

function transport(result: "sent" | "retryable" | "failed", errorCode: string | null = null, invalidate = false): { transport: PushTransport; calls: number } {
  let calls = 0;
  return {
    calls,
    transport: {
      async deliver() {
        calls += 1;
        return { status: result, errorCode, providerMessageId: result === "sent" ? "ticket-1" : null, invalidate };
      },
    },
  };
}

test("a new conversation-message push is delivered immediately and a transport failure stays retryable", async () => {
  const db = base();
  const conversationId = "ff788ff2-d2f1-4534-92d0-e9eb81bad028";
  db.tables.conversations = [
    {
      id: conversationId,
      service_request_id: "request-1",
      specialist_id: "specialist-1",
      client_user_id: "user-client",
      status: "open",
    },
  ];
  db.tables.push_endpoints.push({
    id: "endpoint-specialist",
    user_id: "user-1",
    enabled: true,
    invalidated_at: null,
    token: TOKEN_A,
    platform: "android",
    provider: "expo",
  });
  const posted = await postConversationText(db.supabase, {
    conversationId,
    actor: "client",
    authorUserId: "user-client",
    body: "Otvet",
  });
  assert.equal("id" in posted, true);
  if (!("id" in posted) || !posted.outboxId) return;
  db.tables.notification_outbox.push({
    id: "older-unrelated",
    inbox_item_id: "inbox-other",
    match_id: "match-1",
    recipient_user_id: "user-1",
    channel: "push",
    status: "pending",
    attempt_count: 0,
    next_attempt_at: "2020-01-01T00:00:00.000Z",
    created_at: "2020-01-01T00:00:00.000Z",
    dedupe_key: "other",
  });
  let calls = 0;
  await deliverOutboxById(
    db.supabase,
    posted.outboxId,
    DEFAULT_MATCH_DELIVERY_POLICY,
    {
      push: async () => ({ status: "skipped", providerMessageId: null, errorCode: null }),
      telegram: async () => ({ status: "skipped", providerMessageId: null, errorCode: null }),
      email: async () => ({ status: "skipped", providerMessageId: null, errorCode: null }),
    },
    new Date("2026-01-15T12:00:00+01:00"),
    {
      async deliver() {
        calls += 1;
        throw new Error("expo down");
      },
    },
  );
  assert.equal(calls, 1);
  assert.equal(db.tables.conversation_messages.length, 1);
  assert.equal(db.tables.conversation_messages[0].body, "Otvet");
  const messageOutbox = db.tables.notification_outbox.find((row) => row.id === posted.outboxId);
  assert.equal(messageOutbox?.status, "retryable");
  assert.equal(Number(messageOutbox?.attempt_count) > 0, true);
  assert.equal(db.tables.notification_outbox.find((row) => row.id === "older-unrelated")?.status, "pending");
  assert.equal(db.tables.notification_outbox.find((row) => row.id === "older-unrelated")?.attempt_count ?? 0, 0);
});

function chatNotice(id: string) {
  return {
    id: `inbox-${id}`,
    recipient_user_id: "user-client",
    read_at: null,
    payload: {
      event: "conversation_message",
      conversation_id: "ff788ff2-d2f1-4534-92d0-e9eb81bad028",
      service_request_id: "request-1",
      public_id: "REQ-20260928-8MMQHF",
      service_label: "коуч",
    },
  };
}

function dueRow(id: string, inboxId: string, recipient: string) {
  return {
    id,
    inbox_item_id: inboxId,
    match_id: recipient === "user-1" ? "match-1" : null,
    recipient_user_id: recipient,
    channel: "push",
    status: "pending",
    attempt_count: 0,
    next_attempt_at: "2020-01-01T00:00:00.000Z",
    created_at: "2026-09-28T18:00:00.000Z",
    dedupe_key: id,
  };
}

async function deliverChatAt(clock: string): Promise<{ calls: number; status: unknown; attempt: unknown; next: unknown }> {
  const db = base();
  db.tables.inbox_items.push(chatNotice("chat"));
  db.tables.notification_outbox.push(dueRow("chat", "inbox-chat", "user-client"));
  db.tables.push_endpoints.push({
    id: "endpoint-client",
    user_id: "user-client",
    enabled: true,
    invalidated_at: null,
    token: TOKEN_A,
    platform: "ios",
    provider: "expo",
  });
  let calls = 0;
  await deliverOutboxById(db.supabase, "chat", DEFAULT_MATCH_DELIVERY_POLICY, {
    push: async () => ({ status: "skipped", providerMessageId: null, errorCode: null }),
    telegram: async () => ({ status: "skipped", providerMessageId: null, errorCode: null }),
    email: async () => ({ status: "skipped", providerMessageId: null, errorCode: null }),
  }, new Date(clock), {
    async deliver() {
      calls += 1;
      return { status: "sent", errorCode: null, providerMessageId: "ticket-chat", invalidate: false };
    },
  });
  const row = db.tables.notification_outbox.find((item) => item.id === "chat");
  return { calls, status: row?.status, attempt: row?.attempt_count, next: row?.next_attempt_at };
}

test("conversation messages ignore quiet hours and marketplace notices keep them", async () => {
  assert.equal(quietHoursDeferralApplies("conversation_message"), false);
  assert.equal(quietHoursDeferralApplies("match_available"), true);
  assert.equal(quietHoursDeferralApplies("match_reminder"), true);
  for (const clock of [
    "2026-09-28T21:59:00+02:00",
    "2026-09-28T22:01:00+02:00",
    "2026-01-16T03:00:00+01:00",
    "2026-01-16T07:59:00+01:00",
  ]) {
    const result = await deliverChatAt(clock);
    assert.equal(result.calls, 1, clock);
    assert.equal(result.status, "sent", clock);
    assert.equal(Number(result.attempt) > 0, true, clock);
  }

  const nightMatch = base();
  nightMatch.tables.inbox_items.push({
    id: "inbox-match",
    payload: {
      match_id: "match-1",
      service_request_id: "request-1",
      stage: "initial",
      reminder_index: 0,
      service_label: "Tax advice",
      work_format: null,
      city: null,
      service_languages: [],
      opened: false,
    },
  });
  nightMatch.tables.notification_outbox.push(dueRow("match", "inbox-match", "user-1"));
  let matchCalls = 0;
  await deliverPendingOutbox(nightMatch.supabase, DEFAULT_MATCH_DELIVERY_POLICY, {
    push: async () => ({ status: "sent", providerMessageId: "x", errorCode: null }),
    telegram: async () => ({ status: "skipped", providerMessageId: null, errorCode: null }),
    email: async () => ({ status: "skipped", providerMessageId: null, errorCode: null }),
  }, new Date("2026-09-28T22:01:00+02:00"), {
    async deliver() {
      matchCalls += 1;
      return { status: "sent", errorCode: null, providerMessageId: "ticket", invalidate: false };
    },
  });
  assert.equal(matchCalls, 0);
  assert.equal(nightMatch.tables.notification_outbox[0].status, "pending");
  assert.equal(nightMatch.tables.notification_outbox[0].attempt_count ?? 0, 0);
  assert.notEqual(nightMatch.tables.notification_outbox[0].next_attempt_at, "2020-01-01T00:00:00.000Z");

  const reminder = base();
  reminder.tables.inbox_items.push({
    id: "inbox-reminder",
    payload: {
      match_id: "match-1",
      service_request_id: "request-1",
      stage: "reminder",
      reminder_index: 1,
      service_label: "Tax advice",
      work_format: null,
      city: null,
      service_languages: [],
      opened: false,
    },
  });
  reminder.tables.notification_outbox.push(dueRow("reminder", "inbox-reminder", "user-1"));
  let reminderCalls = 0;
  await deliverPendingOutbox(reminder.supabase, DEFAULT_MATCH_DELIVERY_POLICY, {
    push: async () => ({ status: "sent", providerMessageId: null, errorCode: null }),
    telegram: async () => ({ status: "skipped", providerMessageId: null, errorCode: null }),
    email: async () => ({ status: "skipped", providerMessageId: null, errorCode: null }),
  }, new Date("2026-01-16T03:00:00+01:00"), {
    async deliver() {
      reminderCalls += 1;
      return { status: "sent", errorCode: null, providerMessageId: "ticket", invalidate: false };
    },
  });
  assert.equal(reminderCalls, 0);
  assert.equal(reminder.tables.notification_outbox[0].status, "pending");
  assert.equal(reminder.tables.notification_outbox[0].attempt_count ?? 0, 0);

  const day = base();
  day.tables.inbox_items.push({
    id: "inbox-day",
    payload: {
      match_id: "match-1",
      service_request_id: "request-1",
      stage: "initial",
      reminder_index: 0,
      service_label: "Tax advice",
      work_format: null,
      city: null,
      service_languages: [],
      opened: false,
    },
  });
  day.tables.notification_outbox.push(dueRow("day", "inbox-day", "user-1"));
  day.tables.push_endpoints.push({
    id: "endpoint-day",
    user_id: "user-1",
    enabled: true,
    invalidated_at: null,
    token: TOKEN_B,
    platform: "android",
    provider: "expo",
  });
  let dayCalls = 0;
  await deliverPendingOutbox(day.supabase, DEFAULT_MATCH_DELIVERY_POLICY, {
    push: async () => ({ status: "skipped", providerMessageId: null, errorCode: null }),
    telegram: async () => ({ status: "skipped", providerMessageId: null, errorCode: null }),
    email: async () => ({ status: "skipped", providerMessageId: null, errorCode: null }),
  }, new Date("2026-09-28T12:00:00+02:00"), {
    async deliver() {
      dayCalls += 1;
      return { status: "sent", errorCode: null, providerMessageId: "ticket-day", invalidate: false };
    },
  });
  assert.equal(dayCalls, 1);
  assert.equal(day.tables.notification_outbox[0].status, "sent");

  const disabled = base();
  disabled.tables.notification_preferences.push({ user_id: "user-client", push_enabled: false });
  disabled.tables.inbox_items.push(chatNotice("disabled"));
  disabled.tables.notification_outbox.push(dueRow("disabled", "inbox-disabled", "user-client"));
  disabled.tables.push_endpoints.push({
    id: "endpoint-disabled",
    user_id: "user-client",
    enabled: true,
    invalidated_at: null,
    token: TOKEN_C,
    platform: "ios",
    provider: "expo",
  });
  let disabledCalls = 0;
  await deliverOutboxById(disabled.supabase, "disabled", DEFAULT_MATCH_DELIVERY_POLICY, {
    push: async () => ({ status: "sent", providerMessageId: null, errorCode: null }),
    telegram: async () => ({ status: "skipped", providerMessageId: null, errorCode: null }),
    email: async () => ({ status: "skipped", providerMessageId: null, errorCode: null }),
  }, new Date("2026-09-28T22:01:00+02:00"), {
    async deliver() {
      disabledCalls += 1;
      return { status: "sent", errorCode: null, providerMessageId: "no", invalidate: false };
    },
  });
  assert.equal(disabledCalls, 0);
  assert.equal(disabled.tables.notification_outbox[0].status, "skipped");
  assert.equal(disabled.tables.notification_outbox[0].last_error_code, "push_disabled");

  const failed = await deliverChatAt("2026-09-28T22:01:00+02:00");
  assert.equal(failed.status, "sent");
  const retry = base();
  retry.tables.inbox_items.push(chatNotice("retry"));
  retry.tables.notification_outbox.push(dueRow("retry", "inbox-retry", "user-client"));
  retry.tables.push_endpoints.push({
    id: "endpoint-retry",
    user_id: "user-client",
    enabled: true,
    invalidated_at: null,
    token: TOKEN_A,
    platform: "ios",
    provider: "expo",
  });
  retry.tables.notification_outbox.push(dueRow("other-match", "inbox-other-match", "user-1"));
  retry.tables.inbox_items.push({
    id: "inbox-other-match",
    payload: {
      match_id: "match-1",
      service_request_id: "request-1",
      stage: "initial",
      reminder_index: 0,
      service_label: "Tax advice",
      work_format: null,
      city: null,
      service_languages: [],
      opened: false,
    },
  });
  await deliverOutboxById(retry.supabase, "retry", DEFAULT_MATCH_DELIVERY_POLICY, {
    push: async () => ({ status: "skipped", providerMessageId: null, errorCode: null }),
    telegram: async () => ({ status: "skipped", providerMessageId: null, errorCode: null }),
    email: async () => ({ status: "skipped", providerMessageId: null, errorCode: null }),
  }, new Date("2026-09-28T22:01:00+02:00"), {
    async deliver() {
      throw new Error("expo down");
    },
  });
  assert.equal(retry.tables.notification_outbox.find((row) => row.id === "retry")?.status, "retryable");
  assert.equal(Number(retry.tables.notification_outbox.find((row) => row.id === "retry")?.attempt_count) > 0, true);
  assert.equal(retry.tables.notification_outbox.find((row) => row.id === "other-match")?.status, "pending");
  assert.equal(retry.tables.notification_outbox.find((row) => row.id === "other-match")?.attempt_count ?? 0, 0);
});

test("1-9. endpoint registration is per user and per device", async () => {
  const db = base();
  const first = await registerPushEndpoint(db.supabase, {
    actorUserId: "user-1",
    token: TOKEN_A,
    platform: "ios",
    deviceId: "device-iphone",
    locale: "de",
    timeZone: "Europe/Berlin",
    permissionState: "granted",
  });
  const repeat = await registerPushEndpoint(db.supabase, {
    actorUserId: "user-1",
    token: TOKEN_A,
    platform: "ios",
    deviceId: "device-iphone",
    permissionState: "granted",
  });
  assert.equal("id" in first && "id" in repeat && first.id === repeat.id, true);
  assert.equal(db.tables.push_endpoints.length, 1);
  assert.equal(db.tables.push_endpoints[0].token_hash, hashPushToken(TOKEN_A));

  const rotated = await registerPushEndpoint(db.supabase, {
    actorUserId: "user-1",
    token: TOKEN_B,
    platform: "ios",
    deviceId: "device-iphone",
    permissionState: "granted",
  });
  assert.equal("rotated" in rotated && rotated.rotated, true);
  assert.equal(db.tables.push_endpoints.length, 1);
  assert.equal(db.tables.push_endpoints[0].token_hash, hashPushToken(TOKEN_B));

  const stolen = await registerPushEndpoint(db.supabase, {
    actorUserId: "user-2",
    token: TOKEN_B,
    platform: "android",
    deviceId: "device-pixel",
    permissionState: "granted",
  });
  assert.deepEqual(stolen, { error: "forbidden" });
  assert.equal(db.tables.push_endpoints[0].user_id, "user-1");

  const secondDevice = await registerPushEndpoint(db.supabase, {
    actorUserId: "user-1",
    token: TOKEN_C,
    platform: "android",
    deviceId: "device-pixel",
    permissionState: "granted",
  });
  assert.equal("id" in secondDevice, true);
  assert.equal(db.tables.push_endpoints.length, 2);

  const own = await listOwnPushEndpoints(db.supabase, "user-1");
  const other = await listOwnPushEndpoints(db.supabase, "user-2");
  const anon = await listOwnPushEndpoints(db.supabase, "");
  assert.equal(own.length, 2);
  assert.equal(JSON.stringify(own).includes(TOKEN_C), false);
  assert.equal(other.length, 0);
  assert.equal(anon.length, 0);

  const disabled = await unregisterPushEndpoint(db.supabase, { actorUserId: "user-1", deviceId: "device-iphone" });
  assert.deepEqual(disabled, { disabled: true });
  const iphone = db.tables.push_endpoints.find((row) => row.device_id === "device-iphone");
  assert.equal(iphone?.enabled, false);
  assert.equal(iphone?.token, null);
  assert.equal(typeof iphone?.invalidated_at, "string");
  const stranger = await unregisterPushEndpoint(db.supabase, { actorUserId: "user-2", deviceId: "device-pixel" });
  assert.deepEqual(stranger, { error: "forbidden" });
});

test("10-20. push uses the outbox and does not block other devices or channels", async () => {
  const db = base();
  await registerPushEndpoint(db.supabase, {
    actorUserId: "user-1",
    token: TOKEN_A,
    platform: "ios",
    deviceId: "device-iphone",
    permissionState: "granted",
  });
  await registerPushEndpoint(db.supabase, {
    actorUserId: "user-1",
    token: TOKEN_C,
    platform: "android",
    deviceId: "device-pixel",
    permissionState: "granted",
  });
  db.tables.inbox_items.push({
    id: "inbox-1",
    recipient_user_id: "user-1",
    read_at: null,
    push_tapped_at: null,
    payload: {
      match_id: "match-1",
      service_request_id: "request-1",
      stage: "initial",
      reminder_index: 0,
      service_label: "Tax advice",
      work_format: "offline",
      city: "Berlin",
      service_languages: ["ru"],
      opened: false,
    },
  });
  db.tables.notification_outbox.push({
    id: "out-push",
    inbox_item_id: "inbox-1",
    match_id: "match-1",
    recipient_user_id: "user-1",
    channel: "push",
    status: "pending",
    attempt_count: 0,
    next_attempt_at: "2020-01-01T00:00:00.000Z",
    dedupe_key: "match:match-1:initial:push",
  });
  const seen: Array<{ locale: string; deepLink: string; title: string; body: string }> = [];
  let ios = 0;
  const pushTransport: PushTransport = {
    async deliver(message, endpoint) {
      seen.push({ locale: message.locale, deepLink: message.deepLink, title: message.title, body: message.body });
      if (endpoint.platform === "ios") {
        ios += 1;
        return { status: "failed", errorCode: "push_invalid_token", providerMessageId: null, invalidate: true };
      }
      return { status: "sent", errorCode: null, providerMessageId: "ticket-android", invalidate: false };
    },
  };
  const logs: unknown[] = [];
  const original = console.info;
  console.info = (...args: unknown[]) => {
    logs.push(args);
  };
  try {
    await deliverPendingOutbox(db.supabase, DEFAULT_MATCH_DELIVERY_POLICY, {
      push: async () => ({ status: "skipped", providerMessageId: null, errorCode: "push_not_configured" }),
      telegram: async () => ({ status: "sent", providerMessageId: null, errorCode: null }),
      email: async () => ({ status: "sent", providerMessageId: null, errorCode: null }),
    }, new Date("2026-01-15T12:00:00+01:00"), pushTransport);
  } finally {
    console.info = original;
  }
  assert.equal(seen.length, 2);
  assert.equal(db.tables.notification_outbox[0].status, "sent");
  assert.equal(db.tables.push_endpoints.find((row) => row.device_id === "device-iphone")?.enabled, false);
  assert.equal(db.tables.push_endpoints.find((row) => row.device_id === "device-pixel")?.enabled, true);
  assert.equal(db.tables.inbox_items[0].push_tapped_at ?? null, null);
  assert.equal(db.tables.inbox_items[0].read_at ?? null, null);
  const tapped = await recordPushTap(db.supabase, { inboxId: "inbox-1", userId: "user-1" });
  assert.deepEqual(tapped, { tapped: true, read: false });
  assert.equal(typeof db.tables.inbox_items[0].push_tapped_at, "string");
  assert.equal(db.tables.inbox_items[0].read_at ?? null, null);
  const notice = JSON.stringify(seen);
  assert.equal(notice.includes("client@example.com"), false);
  assert.equal(notice.includes("+49111222333"), false);
  assert.equal(notice.includes("Berlin"), false);
  assert.equal(notice.includes("token="), false);
  assert.equal(notice.includes(TOKEN_A), false);
  assert.equal(seen[0].locale, "de");
  assert.equal(seen[0].deepLink.includes("service_languages"), false);
  assert.equal(seen[0].deepLink.includes("/de/specialist/dashboard/requests/matched/match-1"), true);
  assert.equal(JSON.stringify(logs).includes(TOKEN_A), false);
  assert.equal(JSON.stringify(logs).includes(TOKEN_C), false);
  assert.equal(ios, 1);

  const empty = base();
  empty.tables.inbox_items.push({ id: "inbox-1", payload: { match_id: "match-1", service_request_id: "request-1", stage: "initial", service_label: "Tax", work_format: null, city: null, service_languages: [], opened: false } });
  empty.tables.notification_outbox.push({
    id: "out-push",
    inbox_item_id: "inbox-1",
    match_id: "match-1",
    recipient_user_id: "user-1",
    channel: "push",
    status: "pending",
    attempt_count: 0,
    next_attempt_at: "2020-01-01T00:00:00.000Z",
  });
  const skipped = transport("sent");
  await deliverPendingOutbox(empty.supabase, DEFAULT_MATCH_DELIVERY_POLICY, {
    push: async () => ({ status: "skipped", providerMessageId: null, errorCode: null }),
    telegram: async () => ({ status: "skipped", providerMessageId: null, errorCode: null }),
    email: async () => ({ status: "skipped", providerMessageId: null, errorCode: null }),
  }, new Date("2026-01-15T12:00:00+01:00"), skipped.transport);
  assert.equal(empty.tables.notification_outbox[0].status, "skipped");
  assert.equal(empty.tables.inbox_items.length, 1);

  const retry = base();
  await registerPushEndpoint(retry.supabase, {
    actorUserId: "user-1", token: TOKEN_A, platform: "ios", deviceId: "device-iphone", permissionState: "granted",
  });
  const temporary = await deliverPushFanout(retry.supabase, {
    userId: "user-1",
    locale: "de",
    eventType: "match_available",
    entityId: "match-1",
    deepLink: "/de/specialist/dashboard/requests/matched/match-1",
  }, transport("retryable", "push_temporary").transport);
  assert.equal(temporary.status, "retryable");
  assert.equal(retry.tables.push_endpoints[0].enabled, true);
  const permanent = await deliverPushFanout(retry.supabase, {
    userId: "user-1",
    locale: "de",
    eventType: "match_available",
    entityId: "match-1",
    deepLink: "/de/specialist/dashboard/requests/matched/match-1",
  }, transport("failed", "push_invalid_token", true).transport);
  assert.equal(permanent.status, "failed");
  assert.equal(permanent.endpoints[0].invalidate, true);
  assert.equal(retry.tables.push_endpoints[0].enabled, false);
  assert.equal(classifyPushProviderError({ httpStatus: 429, providerError: null }).status, "retryable");
  assert.equal(classifyPushProviderError({ httpStatus: 200, providerError: "DeviceNotRegistered" }).invalidate, true);
  assert.equal(aggregatePushStatuses(["failed", "sent"]), "sent");
});

test("21-34. push copy, locale and quiet hours follow the recipient", () => {
  const message = buildLockScreenPush({
    locale: "uk-UA",
    eventType: "match_available",
    entityId: "match-1",
    deepLink: httpsDeepLink("https://freuly.de", "/ua/specialist/dashboard/requests/matched/match-1?token=secret"),
    badge: 2,
  });
  assert.equal(message.locale, "ua");
  assert.equal(message.badge, 2);
  assert.equal(message.priority, "high");
  assert.equal(pushPriority("match_reminder"), "normal");
  assert.equal(pushHasPrivateContent(message, "client@example.com"), false);
  assert.equal(message.deepLink.includes("token"), false);
  assert.equal(message.body.includes("Berlin"), false);
  assert.equal(notificationLocale("uk"), "ua");
  assert.equal(notificationLocale("en"), "en");
  assert.equal(buildLockScreenPush({
    locale: "en",
    eventType: "match_available",
    entityId: "match-1",
    deepLink: "/en/specialist/dashboard/inbox",
  }).body, "New matching request");
  const night = new Date("2026-01-15T22:30:00+01:00");
  assert.equal(externalDeliveryDecision(night, resolveRecipientTimeZone("America/Los_Angeles", null)).action, "deliver_now");
  assert.equal(externalDeliveryDecision(night, resolveRecipientTimeZone("GMT+1", null)).action, "defer_until");
  assert.equal(externalDeliveryDecision(night, resolveRecipientTimeZone(null, null)).action, "defer_until");
  const log = pushLogRecord({ endpointId: "ep-1", outcome: "sent", token: TOKEN_A, email: "client@example.com" });
  assert.equal(JSON.stringify(log).includes(TOKEN_A), false);
  assert.equal(JSON.stringify(log).includes("client@"), false);
});

test("35-40. channel preferences do not remove the inbox or grant marketing consent", async () => {
  const planned = planExternalChannels({ hasTelegram: true, hasEmail: true, emailConfigured: true, pushConfigured: true });
  const pushOff = applyTransportPreferences(planned, { push: false, email: true, telegram: true, eventEnabled: true });
  assert.equal(pushOff.find((channel) => channel.channel === "push")?.errorCode, "push_disabled");
  assert.equal(pushOff.find((channel) => channel.channel === "email")?.status, "pending");
  assert.equal(pushOff.find((channel) => channel.channel === "telegram")?.status, "pending");
  const emailOff = applyTransportPreferences(planned, { push: true, email: false, telegram: true, eventEnabled: true });
  assert.equal(emailOff.find((channel) => channel.channel === "email")?.status, "skipped");
  assert.equal(emailOff.find((channel) => channel.channel === "push")?.status, "pending");
  const held = stageInitialChannels(planExternalChannels({ hasTelegram: true, hasEmail: true, emailConfigured: true, pushConfigured: true }));
  assert.equal(held.find((channel) => channel.channel === "email")?.errorCode, "escalation_held");
  assert.equal(held.find((channel) => channel.channel === "telegram")?.status, "pending");

  const db = base();
  db.tables.notification_preferences.push({
    user_id: "user-1",
    push_enabled: true,
    email_enabled: false,
    telegram_enabled: true,
    match_notifications: true,
    selection_notifications: true,
    reminder_notifications: true,
    marketing_consent: false,
  });
  await enqueueMatchNotifications(db.supabase, {
    id: "request-1",
    categoryId: null,
    serviceLanguages: ["ru"],
    workFormat: "offline",
    city: "Berlin",
    postalCode: null,
  }, { emailConfigured: true });
  assert.equal(db.tables.inbox_items.length, 1);
  assert.equal(db.tables.notification_outbox.find((row) => row.channel === "email")?.status, "skipped");
  assert.equal(db.tables.notification_outbox.find((row) => row.channel === "telegram")?.status, "pending");

  const saved = await saveNotificationPreferences(db.supabase, "user-1", { marketingConsent: true, pushEnabled: false });
  assert.equal("marketingConsent" in saved && saved.marketingConsent, false);
  assert.equal(db.tables.notification_preferences.find((row) => row.user_id === "user-1")?.marketing_consent, false);
  assert.equal(db.tables.notification_preferences.find((row) => row.user_id === "user-1")?.push_enabled, false);
});

test("migration keeps push private and settings do not ask on first paint", () => {
  const sql = readFileSync(new URL("../../supabase/manual_migrations/2026-09-26_native_push_notifications.sql", import.meta.url), "utf8");
  assert.match(sql, /2026-09-26_client_selection\.sql/);
  assert.match(sql, /REVOKE ALL ON public\.push_endpoints FROM anon, authenticated/);
  assert.match(sql, /user_id = auth\.uid\(\)/);
  assert.match(sql, /marketing_consent = false/);
  assert.match(sql, /notification_outbox\s+ALTER COLUMN recipient_user_id DROP NOT NULL/);
  assert.equal(sql.includes("title_ru"), false);
  const settings = readFileSync(new URL("../../components/dashboard/settings/NotificationSettings.tsx", import.meta.url), "utf8");
  assert.equal(settings.includes("requestPermission"), false);
  const worker = readFileSync(new URL("../../app/sw.ts", import.meta.url), "utf8");
  assert.equal(worker.includes("pushsubscriptionchange"), false);
});

test("optional Expo access token does not gate a configured device", async () => {
  const message = buildLockScreenPush({
    locale: "de",
    eventType: "match_available",
    entityId: "match-1",
    deepLink: "https://freuly.de/de/specialist/dashboard/inbox",
  });
  const endpoint = { id: "ep", token: TOKEN_A, platform: "ios" as const, provider: "expo" as const };
  const accessToken = "expo-access-token-value";

  async function send(env: string | undefined, ticket: Response) {
    const previous = process.env.EXPO_PUSH_ACCESS_TOKEN;
    if (env === undefined) delete process.env.EXPO_PUSH_ACCESS_TOKEN;
    else process.env.EXPO_PUSH_ACCESS_TOKEN = env;
    const logs: unknown[] = [];
    const original = {
      info: console.info,
      log: console.log,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };
    const record = (...args: unknown[]) => {
      logs.push(args);
    };
    console.info = record;
    console.log = record;
    console.warn = record;
    console.error = record;
    console.debug = record;
    const calls: Array<{ url: string; method: string; authorization: string | null; body: string }> = [];
    const transport = createExpoPushTransport(async (input, init) => {
      const headers = new Headers(init?.headers);
      calls.push({
        url: String(input),
        method: String(init?.method),
        authorization: headers.get("authorization"),
        body: typeof init?.body === "string" ? init.body : "",
      });
      return ticket;
    });
    try {
      const result = await transport.deliver(message, endpoint);
      return { result, calls, logs: JSON.stringify(logs) };
    } finally {
      console.info = original.info;
      console.log = original.log;
      console.warn = original.warn;
      console.error = original.error;
      console.debug = original.debug;
      if (previous === undefined) delete process.env.EXPO_PUSH_ACCESS_TOKEN;
      else process.env.EXPO_PUSH_ACCESS_TOKEN = previous;
    }
  }

  const accepted = () => new Response(JSON.stringify({ data: { status: "ok", id: "ticket-1" } }), { status: 200 });

  const missing = await send(undefined, accepted());
  assert.equal(missing.calls.length, 1);
  assert.equal(missing.calls[0].url, "https://exp.host/--/api/v2/push/send");
  assert.equal(missing.calls[0].method, "POST");
  assert.equal(missing.calls[0].authorization, null);
  assert.equal(missing.result.status, "sent");
  assert.equal(missing.logs.includes(TOKEN_A), false);

  const blank = await send(" \t  ", accepted());
  assert.equal(blank.calls.length, 1);
  assert.equal(blank.calls[0].url, "https://exp.host/--/api/v2/push/send");
  assert.equal(blank.calls[0].method, "POST");
  assert.equal(blank.calls[0].authorization, null);
  assert.equal(blank.result.status, "sent");
  assert.equal(blank.logs.includes(TOKEN_A), false);

  const authed = await send(`  ${accessToken}  `, accepted());
  assert.equal(authed.calls.length, 1);
  assert.equal(authed.calls[0].method, "POST");
  assert.equal(authed.calls[0].authorization, `Bearer ${accessToken}`);
  assert.equal(authed.logs.includes(accessToken), false);
  assert.equal(authed.logs.includes(TOKEN_A), false);
  assert.equal(authed.logs.toLowerCase().includes("authorization"), false);

  const limited = await send(accessToken, new Response("", { status: 429 }));
  assert.equal(limited.result.status, "retryable");
  assert.equal(limited.result.errorCode, "push_temporary");
  assert.equal(limited.result.invalidate, false);

  const unavailable = await send(accessToken, new Response("", { status: 503 }));
  assert.equal(unavailable.result.status, "retryable");
  assert.equal(unavailable.result.errorCode, "push_temporary");
  assert.equal(unavailable.result.invalidate, false);

  const gone = await send(accessToken, new Response(JSON.stringify({
    data: { status: "error", details: { error: "DeviceNotRegistered" } },
  }), { status: 200 }));
  assert.equal(gone.result.status, "failed");
  assert.equal(gone.result.errorCode, "push_invalid_token");
  assert.equal(gone.result.invalidate, true);
  assert.equal(gone.logs.includes(accessToken), false);
  assert.equal(gone.logs.includes(TOKEN_A), false);

  assert.equal(classifyPushProviderError({ httpStatus: 429, providerError: null }).status, "retryable");
  assert.equal(classifyPushProviderError({ httpStatus: 500, providerError: null }).status, "retryable");
  assert.equal(classifyPushProviderError({ httpStatus: 200, providerError: "DeviceNotRegistered" }).status, "failed");
  assert.equal(classifyPushProviderError({ httpStatus: 200, providerError: "DeviceNotRegistered" }).invalidate, true);
  assert.equal(classifyPushProviderError({ httpStatus: 200, providerError: "MessageRateExceeded" }).status, "retryable");
  assert.equal(classifyPushProviderError({ httpStatus: 400, providerError: "push_rejected" }).status, "failed");
  assert.equal(classifyPushProviderError({ httpStatus: 400, providerError: "push_rejected" }).invalidate, false);

  const readyDb = base();
  await registerPushEndpoint(readyDb.supabase, {
    actorUserId: "user-1",
    token: TOKEN_A,
    platform: "android",
    deviceId: "device-pixel",
    permissionState: "granted",
  });
  const readyPrevious = process.env.EXPO_PUSH_ACCESS_TOKEN;
  delete process.env.EXPO_PUSH_ACCESS_TOKEN;
  const fanoutLogs: unknown[] = [];
  const originalInfo = console.info;
  console.info = (...args: unknown[]) => {
    fanoutLogs.push(args);
  };
  try {
    assert.equal(await isRecipientPushReady(readyDb.supabase, "user-1"), true);
    const fanout = await deliverPushFanout(readyDb.supabase, {
      userId: "user-1",
      locale: "de",
      eventType: "match_available",
      entityId: "match-1",
      deepLink: "/de/specialist/dashboard/requests/matched/match-1",
    }, createExpoPushTransport(async () => new Response(JSON.stringify({
      data: { status: "error", details: { error: "DeviceNotRegistered" } },
    }), { status: 200 })));
    assert.equal(fanout.status, "failed");
    assert.equal(fanout.endpoints[0].invalidate, true);
    assert.equal(readyDb.tables.push_endpoints[0].enabled, false);
    assert.equal(typeof readyDb.tables.push_endpoints[0].invalidated_at, "string");
    const logged = JSON.stringify(fanoutLogs);
    assert.equal(logged.includes(TOKEN_A), false);
    assert.equal(logged.toLowerCase().includes("authorization"), false);
  } finally {
    console.info = originalInfo;
    if (readyPrevious === undefined) delete process.env.EXPO_PUSH_ACCESS_TOKEN;
    else process.env.EXPO_PUSH_ACCESS_TOKEN = readyPrevious;
  }

  const missingDevice = base();
  const missingDevicePrevious = process.env.EXPO_PUSH_ACCESS_TOKEN;
  process.env.EXPO_PUSH_ACCESS_TOKEN = accessToken;
  try {
    assert.equal(await isRecipientPushReady(missingDevice.supabase, "user-1"), false);
    await enqueueMatchNotifications(missingDevice.supabase, {
      id: "request-1",
      categoryId: null,
      serviceLanguages: ["ru"],
      workFormat: "offline",
      city: "Berlin",
      postalCode: null,
    }, { emailConfigured: true });
    const push = missingDevice.tables.notification_outbox.find((row) => row.channel === "push");
    assert.equal(push?.status, "skipped");
    assert.equal(push?.last_error_code, "push_not_configured");
  } finally {
    if (missingDevicePrevious === undefined) delete process.env.EXPO_PUSH_ACCESS_TOKEN;
    else process.env.EXPO_PUSH_ACCESS_TOKEN = missingDevicePrevious;
  }
});

test("native tap payload includes the inbox id and the conversation path", () => {
  const request = buildExpoPushRequest({
    ...buildLockScreenPush({
      locale: "ua",
      eventType: "connection_ready",
      entityId: "request-1",
      deepLink: "https://freuly.de/ua/requests/REQ-20260926-ABC123/conversation",
    }),
    inboxItemId: "33333333-3333-4333-8333-333333333333",
    conversationId: "22222222-2222-4222-8222-222222222222",
  }, TOKEN_A);
  assert.equal(request.data.inboxItemId, "33333333-3333-4333-8333-333333333333");
  assert.equal(request.data.conversationId, "22222222-2222-4222-8222-222222222222");
  assert.equal(JSON.stringify(request.data).includes(TOKEN_A), false);
  assert.equal(
    pushPathForEvent({ locale: "ua", eventType: "connection_ready", publicId: "REQ-20260926-ABC123" }),
    "/ua/requests/REQ-20260926-ABC123/conversation",
  );
  const unread = readFileSync(new URL("../../app/api/inbox/unread/route.ts", import.meta.url), "utf8");
  assert.match(unread, /countUnreadInbox/);
  assert.match(unread, /requirePushUser/);
});
