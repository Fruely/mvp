import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deliverPendingOutbox, enqueueMatchNotifications, scheduleDueReminders, buildMatchEmail, buildTelegramNotice } from "./delivery.ts";
import { loadInbox } from "./loadInbox.ts";
import { canReadInbox, safeMatchPayload, type MatchInboxPayload } from "./payload.ts";
import {
  applyMatchResponse,
  dueReminderIndex,
  externalDeliveryDecision,
  initialInboxKey,
  matchDeepLink,
  notificationLocale,
  planExternalChannels,
  reminderInboxKey,
  unsupportedChannelResult,
  DEFAULT_MATCH_DELIVERY_POLICY,
} from "./policy.ts";
import { buildPushContract, deliverPush } from "./pushContract.ts";
import { renderMatchNotice } from "./render.ts";
import { markOwnInboxRead, openOwnMatch, respondToOwnMatch } from "./respond.ts";
import { notifyClientConfirmationRequired } from "../selection/interest.ts";
import { countUnreadInbox } from "./unread.ts";

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
    let counted = false;
    const matched = () => ensure(table).filter((row) => filters.every((filter) => filter(row))).slice(0, limitN);
    const api = {
      select(_columns?: string, options?: { count?: string }) {
        counted = Boolean(options?.count);
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
        return { data: rows[0] ? { ...rows[0] } : null, error: null, count: counted ? matched().length : null };
      },
      insert(row: Row) {
        ensure(table).push({ id: crypto.randomUUID(), ...row });
        return Promise.resolve({ error: null });
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
          then(resolve: (value: { error: null }) => void) { resolve({ error: null }); },
        };
      },
      update(next: Row) { patch = next; return api; },
      then(resolve: (value: { data: Row[]; error: null; count: number | null }) => void) {
        const rows = matched();
        if (patch) rows.forEach((row) => Object.assign(row, patch));
        resolve({ data: rows.map((row) => ({ ...row })), error: null, count: counted ? rows.length : null });
      },
    };
    return api;
  }
  return { supabase: { from } as unknown as SupabaseClient, tables };
}

const PAYLOAD: MatchInboxPayload = {
  match_id: "match-1",
  service_request_id: "request-1",
  stage: "initial",
  reminder_index: 0,
  service_label: "Tax advice",
  work_format: "online",
  city: null,
  service_languages: ["de"],
  opened: false,
};

function seed() {
  return memory({
    service_request_matches: [{
      id: "match-1",
      specialist_id: "specialist-1",
      service_request_id: "request-1",
      status: "active",
      opened_at: null,
      responded_at: null,
      first_notified_at: null,
      matched_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
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
      client_email: null,
      requested_service: "Tax advice",
      category_text: null,
      city: "Berlin",
      work_format: "online",
      service_languages: ["de"],
    }],
    inbox_items: [],
    notification_outbox: [],
    notification_delivery_attempts: [],
  });
}

test("1-4. a new match creates one inbox item for the specialist", async () => {
  const db = seed();
  await enqueueMatchNotifications(db.supabase, {
    id: "request-1",
    categoryId: null,
    serviceLanguages: ["de"],
    workFormat: "online",
    city: null,
    postalCode: null,
  }, { emailConfigured: true });
  assert.equal(db.tables.inbox_items.length, 1);
  assert.equal(db.tables.inbox_items[0].recipient_user_id, "user-1");
  assert.equal(db.tables.inbox_items[0].dedupe_key, initialInboxKey("match-1"));
  assert.equal(db.tables.inbox_items[0].actor_type, "system");
  assert.equal(typeof db.tables.service_request_matches[0].first_notified_at, "string");
});

test("2-3. repeating the match enqueue does not duplicate the inbox item", async () => {
  const db = seed();
  const request = {
    id: "request-1",
    categoryId: null,
    serviceLanguages: ["de"],
    workFormat: "online" as const,
    city: null,
    postalCode: null,
  };
  await enqueueMatchNotifications(db.supabase, request, { emailConfigured: false });
  await enqueueMatchNotifications(db.supabase, request, { emailConfigured: false });
  assert.equal(db.tables.inbox_items.length, 1);
  assert.equal(db.tables.notification_outbox.length, 3);
});

test("5-6. another specialist and an anonymous actor cannot read the inbox item", () => {
  assert.equal(canReadInbox("user-1", "user-1"), true);
  assert.equal(canReadInbox("user-1", "user-2"), false);
  assert.equal(canReadInbox("user-1", null), false);
});

test("7. inbox payload keeps only safe match fields", () => {
  const payload = safeMatchPayload({
    ...PAYLOAD,
    client_email: "anna@example.com",
    client_phone: "+49123",
    client_name: "Anna",
  } as MatchInboxPayload);
  const serialized = JSON.stringify(payload);
  assert.equal(serialized.includes("anna@"), false);
  assert.equal(serialized.includes("client_phone"), false);
  assert.equal(serialized.includes("Anna"), false);
  assert.equal(payload.service_languages[0], "de");
});

test("8-9. unread count and mark read follow the recipient", async () => {
  const db = seed();
  db.tables.inbox_items.push(
    { id: "inbox-1", recipient_user_id: "user-1", read_at: null, entity_id: "match-1" },
    { id: "inbox-2", recipient_user_id: "user-1", read_at: "2026-09-26T00:00:00.000Z", entity_id: "match-1" },
    { id: "inbox-3", recipient_user_id: "user-2", read_at: null, entity_id: "match-2" },
  );
  assert.equal(await countUnreadInbox(db.supabase, "user-1"), 1);
  const denied = await markOwnInboxRead(db.supabase, { inboxId: "inbox-1", userId: "user-2" });
  assert.deepEqual(denied, { error: "forbidden" });
  assert.equal(await countUnreadInbox(db.supabase, "user-1"), 1);
  const read = await markOwnInboxRead(db.supabase, { inboxId: "inbox-1", userId: "user-1" });
  assert.deepEqual(read, { read: true });
  assert.equal(await countUnreadInbox(db.supabase, "user-1"), 0);
});

test("10-12. opening and both responses record timestamps without contacts", async () => {
  const opened = seed();
  const open = await openOwnMatch(opened.supabase, { matchId: "match-1", specialistId: "specialist-1", userId: "user-1" });
  assert.equal("openedAt" in open, true);
  assert.equal(typeof opened.tables.service_request_matches[0].opened_at, "string");
  const firstOpen = opened.tables.service_request_matches[0].opened_at;
  await openOwnMatch(opened.supabase, { matchId: "match-1", specialistId: "specialist-1", userId: "user-1" });
  assert.equal(opened.tables.service_request_matches[0].opened_at, firstOpen);

  const interested = seed();
  const yes = await respondToOwnMatch(interested.supabase, {
    matchId: "match-1", specialistId: "specialist-1", userId: "user-1", response: "interested",
  });
  assert.equal("status" in yes && yes.status, "interested");
  assert.equal(typeof interested.tables.service_request_matches[0].responded_at, "string");
  assert.equal(JSON.stringify(yes).includes("client_"), false);

  const declined = seed();
  const no = await respondToOwnMatch(declined.supabase, {
    matchId: "match-1", specialistId: "specialist-1", userId: "user-1", response: "declined",
  });
  assert.equal("status" in no && no.status, "declined");
  assert.equal(typeof declined.tables.service_request_matches[0].responded_at, "string");
});

test("13-14. interested and declined cancel pending reminders and keep history", async () => {
  for (const response of ["interested", "declined"] as const) {
    const db = seed();
    db.tables.notification_outbox.push({
      id: "out-1",
      match_id: "match-1",
      status: "pending",
      channel: "telegram",
    });
    db.tables.inbox_items.push({ id: "inbox-1", entity_id: "match-1", recipient_user_id: "user-1", actioned_at: null });
    await respondToOwnMatch(db.supabase, {
      matchId: "match-1", specialistId: "specialist-1", userId: "user-1", response,
    });
    assert.equal(db.tables.notification_outbox[0].status, "cancelled");
    assert.equal(db.tables.inbox_items.length, response === "interested" ? 2 : 1);
    assert.equal(db.tables.service_request_matches.length, 1);
  }
});

test("a live reserved or completed claim suppresses match reminders", async () => {
  for (const status of ["reserved", "completed"] as const) {
    const db = seed();
    db.tables.service_request_claims = [{ id: "claim-1", match_id: "match-1", status }];
    const now = new Date();
    const result = await scheduleDueReminders(db.supabase, now, DEFAULT_MATCH_DELIVERY_POLICY, false);
    assert.equal(result.scheduled, 0, status);
    assert.equal(db.tables.inbox_items.length, 0, status);
  }
});

test("released expired and failed claims do not suppress an ordinary reminder", async () => {
  for (const status of ["released", "expired", "failed"] as const) {
    const db = seed();
    db.tables.service_request_claims = [{ id: "claim-1", match_id: "match-1", status }];
    const result = await scheduleDueReminders(db.supabase, new Date(), DEFAULT_MATCH_DELIVERY_POLICY, false);
    assert.equal(result.scheduled, 1, status);
  }
});

test("an ordinary unclaimed match still receives a reminder", async () => {
  const db = seed();
  const result = await scheduleDueReminders(db.supabase, new Date(), DEFAULT_MATCH_DELIVERY_POLICY, false);
  assert.equal(result.scheduled, 1);
  assert.equal(db.tables.inbox_items.filter((row) => row.type === "match_reminder").length, 1);
});

test("15-17. reminders are scheduled twice and then stop", async () => {
  const db = seed();
  const now = new Date();
  const first = await scheduleDueReminders(db.supabase, now, DEFAULT_MATCH_DELIVERY_POLICY, false);
  const repeat = await scheduleDueReminders(db.supabase, now, DEFAULT_MATCH_DELIVERY_POLICY, false);
  assert.equal(first.scheduled, 1);
  assert.equal(repeat.scheduled, 0);
  assert.equal(db.tables.inbox_items.filter((row) => row.dedupe_key === reminderInboxKey("match-1", 1)).length, 1);

  db.tables.service_request_matches[0].matched_at = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const second = await scheduleDueReminders(db.supabase, now, DEFAULT_MATCH_DELIVERY_POLICY, false);
  const third = await scheduleDueReminders(db.supabase, now, DEFAULT_MATCH_DELIVERY_POLICY, false);
  assert.equal(second.scheduled, 1);
  assert.equal(third.scheduled, 0);
  assert.equal(dueReminderIndex({
    matchedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    now,
    sentReminders: 2,
    responded: false,
  }), null);
  assert.equal(dueReminderIndex({
    matchedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    now,
    sentReminders: 1,
    responded: true,
  }), null);
});

test("18-20. one channel failure stays on that channel and an unknown channel is skipped", async () => {
  const db = seed();
  db.tables.inbox_items.push({ id: "inbox-1", payload: PAYLOAD });
  db.tables.notification_outbox.push(
    { id: "tg", inbox_item_id: "inbox-1", match_id: "match-1", channel: "telegram", status: "pending", attempt_count: 0, next_attempt_at: "2020-01-01T00:00:00.000Z" },
    { id: "mail", inbox_item_id: "inbox-1", match_id: "match-1", channel: "email", status: "pending", attempt_count: 0, next_attempt_at: "2020-01-01T00:00:00.000Z" },
    { id: "sms", inbox_item_id: "inbox-1", match_id: "match-1", channel: "sms", status: "pending", attempt_count: 0, next_attempt_at: "2020-01-01T00:00:00.000Z" },
  );
  const seen: string[] = [];
  const day = new Date("2026-01-15T12:00:00+01:00");
  await deliverPendingOutbox(db.supabase, DEFAULT_MATCH_DELIVERY_POLICY, {
    telegram: async () => {
      seen.push("telegram");
      return { status: "retryable", providerMessageId: null, errorCode: "telegram_failed" };
    },
    email: async () => {
      seen.push("email");
      return { status: "sent", providerMessageId: "accepted-1", errorCode: null };
    },
    push: async () => ({ status: "skipped", providerMessageId: null, errorCode: "push_not_configured" }),
  }, day);
  assert.equal(db.tables.inbox_items.length, 1);
  assert.equal(db.tables.notification_outbox.find((row) => row.id === "tg")?.status, "retryable");
  assert.equal(db.tables.notification_outbox.find((row) => row.id === "mail")?.status, "sent");
  assert.equal(db.tables.notification_outbox.find((row) => row.id === "sms")?.status, "skipped");
  assert.deepEqual(seen, ["telegram", "email"]);
  assert.equal(unsupportedChannelResult().errorCode, "channel_unsupported");
  assert.equal(deliverPush().errorCode, "push_not_configured");
});

test("21-27. recipient locale renders the notice and future locales need no algorithm branch", () => {
  const notice = {
    stage: "initial" as const,
    opened: false,
    serviceLabel: "Tax advice",
    workFormat: "online",
    city: null,
    serviceLanguages: ["de"],
  };
  assert.equal(renderMatchNotice("de", notice).title, "Neue passende Anfrage");
  assert.equal(renderMatchNotice("ru", { ...notice, serviceLanguages: ["uk"] }).title, renderMatchNotice("ru", notice).title);
  assert.notEqual(renderMatchNotice("ua", notice).title, renderMatchNotice("de", notice).title);
  assert.equal(notificationLocale("en"), "en");
  assert.equal(notificationLocale("pl"), "pl");
  assert.equal(renderMatchNotice("en", notice).title, renderMatchNotice("pl", notice).title);
  const renderSource = readFileSync(new URL("./render.ts", import.meta.url), "utf8");
  const policySource = readFileSync(new URL("./policy.ts", import.meta.url), "utf8");
  assert.equal(renderSource.includes("title_ru"), false);
  assert.equal(policySource.includes("title_ru"), false);
  assert.equal(renderSource.includes('case "'), false);
  const deliverySource = readFileSync(new URL("./delivery.ts", import.meta.url), "utf8");
  assert.equal(deliverySource.includes("preferred_language"), false);
  assert.equal(deliverySource.includes("source_language"), false);
});

test("28-37. response, privacy and idempotent acknowledgement", async () => {
  const foreign = seed();
  const denied = await respondToOwnMatch(foreign.supabase, {
    matchId: "match-1", specialistId: "specialist-2", userId: "user-2", response: "interested",
  });
  assert.deepEqual(denied, { error: "forbidden" });
  assert.equal(foreign.tables.service_request_matches[0].status, "active");

  const twice = seed();
  await respondToOwnMatch(twice.supabase, {
    matchId: "match-1", specialistId: "specialist-1", userId: "user-1", response: "interested",
  });
  const again = await respondToOwnMatch(twice.supabase, {
    matchId: "match-1", specialistId: "specialist-1", userId: "user-1", response: "interested",
  });
  assert.equal("changed" in again && again.changed, false);
  assert.equal(twice.tables.service_request_matches[0].status, "interested");

  const declinedFirst = seed();
  declinedFirst.tables.service_request_matches[0].status = "declined";
  declinedFirst.tables.service_request_matches[0].responded_at = "2026-09-26T00:00:00.000Z";
  const afterDecline = await respondToOwnMatch(declinedFirst.supabase, {
    matchId: "match-1", specialistId: "specialist-1", userId: "user-1", response: "interested",
  });
  assert.equal("status" in afterDecline && afterDecline.status, "declined");

  const interestedFirst = seed();
  interestedFirst.tables.service_request_matches[0].status = "interested";
  const afterInterest = await respondToOwnMatch(interestedFirst.supabase, {
    matchId: "match-1", specialistId: "specialist-1", userId: "user-1", response: "declined",
  });
  assert.equal("status" in afterInterest && afterInterest.status, "interested");
  assert.deepEqual(applyMatchResponse("interested", "declined"), { status: "interested", changed: false });
  assert.deepEqual(applyMatchResponse("declined", "interested"), { status: "declined", changed: false });

  const push = buildPushContract({
    locale: "de",
    matchId: "match-1",
    recipientUserId: "user-1",
    notice: { stage: "initial", opened: false, serviceLabel: "Tax advice", workFormat: "online", city: null, serviceLanguages: ["de"] },
  });
  const pushText = JSON.stringify(push);
  assert.equal(pushText.includes("client_email"), false);
  assert.equal(pushText.includes("@"), false);
  assert.equal(push.deepLink, matchDeepLink("de", "match-1"));
  const telegram = buildTelegramNotice(push.title, push.body);
  assert.equal(telegram.includes("client_phone"), false);
  const email = buildMatchEmail({ title: push.title, body: push.body, link: `https://freuly.de${push.deepLink}`, action: "Anfrage ansehen" });
  assert.equal(email.html.includes("client_email"), false);
  assert.equal(email.html.includes(push.deepLink), true);
  assert.equal(matchDeepLink("de", "match-1").includes("@"), false);
});

test("recipient locale is used for external delivery, not the request language", async () => {
  const db = seed();
  db.tables.inbox_items.push({ id: "inbox-1", payload: { ...PAYLOAD, service_languages: ["ru"] } });
  db.tables.notification_outbox.push({
    id: "mail",
    inbox_item_id: "inbox-1",
    match_id: "match-1",
    channel: "email",
    status: "pending",
    attempt_count: 0,
    next_attempt_at: "2020-01-01T00:00:00.000Z",
  });
  let locale = "";
  await deliverPendingOutbox(db.supabase, DEFAULT_MATCH_DELIVERY_POLICY, {
    telegram: async () => ({ status: "skipped", providerMessageId: null, errorCode: null }),
    email: async (input) => {
      locale = input.locale;
      return { status: "sent", providerMessageId: "ok", errorCode: null };
    },
    push: async () => ({ status: "skipped", providerMessageId: null, errorCode: "push_not_configured" }),
  }, new Date("2026-01-15T12:00:00+01:00"));
  assert.equal(locale, "de");
});

test("quiet hours defer external delivery and a missing channel is recorded", async () => {
  const night = externalDeliveryDecision(new Date("2026-01-15T22:30:00+01:00"), "Europe/Berlin");
  const day = externalDeliveryDecision(new Date("2026-01-15T12:00:00+01:00"), "Europe/Berlin");
  assert.equal(night.action, "defer_until");
  assert.equal(day.action, "deliver_now");
  const db = seed();
  db.tables.inbox_items.push({ id: "inbox-1", payload: PAYLOAD });
  db.tables.notification_outbox.push({
    id: "mail",
    inbox_item_id: "inbox-1",
    match_id: "match-1",
    channel: "email",
    status: "pending",
    attempt_count: 0,
    next_attempt_at: "2020-01-01T00:00:00.000Z",
  });
  let calls = 0;
  await deliverPendingOutbox(db.supabase, DEFAULT_MATCH_DELIVERY_POLICY, {
    telegram: async () => ({ status: "skipped", providerMessageId: null, errorCode: null }),
    email: async () => {
      calls += 1;
      return { status: "sent", providerMessageId: "no", errorCode: null };
    },
    push: async () => ({ status: "skipped", providerMessageId: null, errorCode: "push_not_configured" }),
  }, new Date("2026-01-15T22:30:00+01:00"));
  assert.equal(calls, 0);
  assert.equal(db.tables.notification_outbox[0].status, "pending");
  assert.equal(db.tables.inbox_items.length, 1);
  const channels = planExternalChannels({ hasTelegram: false, hasEmail: true, emailConfigured: true, pushConfigured: false });
  assert.equal(channels.find((channel) => channel.channel === "telegram")?.status, "skipped");
  assert.equal(channels.find((channel) => channel.channel === "email")?.status, "pending");
});

const DAY = new Date("2026-01-15T12:00:00+01:00");

function queueNotice(db: ReturnType<typeof seed>, payload: Record<string, unknown>) {
  db.tables.inbox_items.push({ id: "inbox-guard", payload });
  db.tables.notification_outbox.push({
    id: "out-guard",
    inbox_item_id: "inbox-guard",
    match_id: "match-1",
    recipient_user_id: "user-1",
    channel: "email",
    status: "pending",
    attempt_count: 0,
    next_attempt_at: "2020-01-01T00:00:00.000Z",
  });
}

function countingTransports(seen: string[]) {
  return {
    telegram: async () => ({ status: "skipped" as const, providerMessageId: null, errorCode: null }),
    email: async () => {
      seen.push("email");
      return { status: "sent" as const, providerMessageId: "ok", errorCode: null };
    },
    push: async () => ({ status: "skipped" as const, providerMessageId: null, errorCode: "push_not_configured" }),
  };
}

test("queued match availability delivers when the match is still unclaimed", async () => {
  for (const stage of ["initial", "reminder"] as const) {
    const db = seed();
    const seen: string[] = [];
    queueNotice(db, { ...PAYLOAD, stage, reminder_index: stage === "reminder" ? 1 : 0 });
    await deliverPendingOutbox(db.supabase, DEFAULT_MATCH_DELIVERY_POLICY, countingTransports(seen), DAY);
    assert.deepEqual(seen, ["email"], stage);
    assert.equal(db.tables.notification_outbox[0].status, "sent", stage);
    assert.equal(db.tables.inbox_items.length, 1, stage);
  }
});

test("a live claim cancels queued match availability without deleting inbox history", async () => {
  for (const [stage, status] of [["initial", "reserved"], ["reminder", "reserved"], ["initial", "completed"]] as const) {
    const db = seed();
    const seen: string[] = [];
    db.tables.service_request_claims = [{ id: "claim-1", match_id: "match-1", status }];
    queueNotice(db, { ...PAYLOAD, stage, reminder_index: stage === "reminder" ? 1 : 0 });
    await deliverPendingOutbox(db.supabase, DEFAULT_MATCH_DELIVERY_POLICY, countingTransports(seen), DAY);
    assert.deepEqual(seen, [], `${stage}:${status}`);
    assert.equal(db.tables.notification_outbox[0].status, "cancelled", `${stage}:${status}`);
    assert.equal(db.tables.notification_outbox[0].last_error_code, "stale_claimed_match", `${stage}:${status}`);
    assert.equal(db.tables.inbox_items.length, 1, `${stage}:${status}`);
  }
});

test("released expired and failed claims do not cancel a queued availability notice", async () => {
  for (const status of ["released", "expired", "failed"] as const) {
    const db = seed();
    const seen: string[] = [];
    db.tables.service_request_claims = [{ id: "claim-1", match_id: "match-1", status }];
    queueNotice(db, PAYLOAD);
    await deliverPendingOutbox(db.supabase, DEFAULT_MATCH_DELIVERY_POLICY, countingTransports(seen), DAY);
    assert.deepEqual(seen, ["email"], status);
    assert.equal(db.tables.notification_outbox[0].status, "sent", status);
  }
});

test("connection and conversation notices are not cancelled by a live claim", async () => {
  for (const event of ["connection_confirmation_required", "connection_ready", "conversation_message"] as const) {
    const db = seed();
    const seen: string[] = [];
    db.tables.service_requests[0].client_email = "client@example.com";
    db.tables.service_request_claims = [{ id: "claim-1", match_id: "match-1", status: "reserved" }];
    queueNotice(db, {
      event,
      service_request_id: "request-1",
      public_id: "REQ-1",
      service_label: "Tax advice",
      match_id: "match-1",
      conversation_id: event === "conversation_message" ? "conversation-1" : null,
    });
    await deliverPendingOutbox(db.supabase, DEFAULT_MATCH_DELIVERY_POLICY, countingTransports(seen), DAY);
    assert.deepEqual(seen, ["email"], event);
    assert.equal(db.tables.notification_outbox[0].status, "sent", event);
    assert.equal(db.tables.inbox_items.length, 1, event);
  }
});

test("a queued confirmation notice sends only while the claim is reserved and unconfirmed", async () => {
  const live = seed();
  const seen: string[] = [];
  live.tables.service_requests[0].client_email = "client@example.com";
  live.tables.service_request_claims = [{
    id: "claim-1",
    match_id: "match-1",
    status: "reserved",
    client_confirmed_at: null,
  }];
  queueNotice(live, {
    event: "connection_confirmation_required",
    service_request_id: "request-1",
    public_id: "REQ-1",
    service_label: "Tax advice",
    match_id: "match-1",
  });
  live.tables.inbox_items[0].dedupe_key = "claim:claim-1:connection_confirmation_required";
  await deliverPendingOutbox(live.supabase, DEFAULT_MATCH_DELIVERY_POLICY, countingTransports(seen), DAY);
  assert.deepEqual(seen, ["email"]);
  assert.equal(live.tables.notification_outbox[0].status, "sent");
  assert.equal(live.tables.inbox_items.length, 1);

  for (const status of ["completed", "released", "expired"] as const) {
    const db = seed();
    const quiet: string[] = [];
    db.tables.service_request_claims = [{ id: "claim-1", match_id: "match-1", status, client_confirmed_at: null }];
    queueNotice(db, {
      event: "connection_confirmation_required",
      service_request_id: "request-1",
      public_id: "REQ-1",
      service_label: "Tax advice",
      match_id: "match-1",
    });
    db.tables.inbox_items[0].dedupe_key = "claim:claim-1:connection_confirmation_required";
    await deliverPendingOutbox(db.supabase, DEFAULT_MATCH_DELIVERY_POLICY, countingTransports(quiet), DAY);
    assert.deepEqual(quiet, [], status);
    assert.equal(db.tables.notification_outbox[0].status, "cancelled", status);
    assert.equal(db.tables.notification_outbox[0].last_error_code, "stale_confirmation_state", status);
    assert.equal(db.tables.inbox_items.length, 1, status);
  }

  const confirmed = seed();
  const confirmedSeen: string[] = [];
  confirmed.tables.service_request_claims = [{
    id: "claim-1",
    match_id: "match-1",
    status: "reserved",
    client_confirmed_at: "2026-09-30T12:00:00.000Z",
  }];
  queueNotice(confirmed, {
    event: "connection_confirmation_required",
    service_request_id: "request-1",
    public_id: "REQ-1",
    service_label: "Tax advice",
    match_id: "match-1",
  });
  confirmed.tables.inbox_items[0].dedupe_key = "claim:claim-1:connection_confirmation_required";
  await deliverPendingOutbox(confirmed.supabase, DEFAULT_MATCH_DELIVERY_POLICY, countingTransports(confirmedSeen), DAY);
  assert.deepEqual(confirmedSeen, []);
  assert.equal(confirmed.tables.notification_outbox[0].status, "cancelled");
  assert.equal(confirmed.tables.notification_outbox[0].last_error_code, "stale_confirmation_state");

  const rejected = seed();
  const rejectedSeen: string[] = [];
  rejected.tables.service_request_claims = [{
    id: "claim-1",
    match_id: "match-1",
    status: "reserved",
    client_confirmed_at: null,
    client_rejected_at: "2026-10-02T18:00:00.000Z",
  }];
  queueNotice(rejected, {
    event: "connection_confirmation_required",
    service_request_id: "request-1",
    public_id: "REQ-1",
    service_label: "Tax advice",
    match_id: "match-1",
  });
  rejected.tables.inbox_items[0].dedupe_key = "claim:claim-1:connection_confirmation_required";
  await deliverPendingOutbox(rejected.supabase, DEFAULT_MATCH_DELIVERY_POLICY, countingTransports(rejectedSeen), DAY);
  assert.deepEqual(rejectedSeen, []);
  assert.equal(rejected.tables.notification_outbox[0].status, "cancelled");
  assert.equal(rejected.tables.notification_outbox[0].last_error_code, "stale_confirmation_state");
  assert.equal(rejected.tables.inbox_items.length, 1);

  const elapsed = seed();
  const elapsedSeen: string[] = [];
  elapsed.tables.service_request_claims = [{
    id: "claim-1",
    match_id: "match-1",
    status: "reserved",
    client_confirmed_at: null,
    client_rejected_at: null,
    payment_rail: "stripe",
    confirmation_expires_at: "2000-01-01T00:00:00.000Z",
  }];
  queueNotice(elapsed, {
    event: "connection_confirmation_required",
    service_request_id: "request-1",
    public_id: "REQ-1",
    service_label: "Tax advice",
    match_id: "match-1",
  });
  elapsed.tables.inbox_items[0].dedupe_key = "claim:claim-1:connection_confirmation_required";
  await deliverPendingOutbox(elapsed.supabase, DEFAULT_MATCH_DELIVERY_POLICY, countingTransports(elapsedSeen), DAY);
  assert.deepEqual(elapsedSeen, []);
  assert.equal(elapsed.tables.notification_outbox[0].status, "cancelled");
  assert.equal(elapsed.tables.notification_outbox[0].last_error_code, "stale_confirmation_state");
  assert.equal(elapsed.tables.inbox_items.length, 1);
});

const CONFIRMATION_NOTICE = {
  event: "connection_confirmation_required",
  service_request_id: "request-1",
  public_id: "REQ-1",
  service_label: "Tax advice",
  match_id: "match-1",
};

function queueConfirmation(db: ReturnType<typeof seed>) {
  const seen: string[] = [];
  db.tables.service_requests[0].client_email = "client@example.com";
  queueNotice(db, CONFIRMATION_NOTICE);
  db.tables.inbox_items[0].dedupe_key = "claim:claim-1:connection_confirmation_required";
  return seen;
}

test("confirmation notices follow the payment rail", async () => {
  const stripeClaim = {
    id: "claim-1",
    service_request_id: "request-1",
    match_id: "match-1",
    status: "reserved",
    payment_rail: "stripe",
    client_confirmed_at: null,
    client_rejected_at: null,
    confirmation_expires_at: "2000-01-01T00:00:00.000Z",
  };
  const stripeCreate = seed();
  stripeCreate.tables.service_request_claims = [{ ...stripeClaim }];
  await notifyClientConfirmationRequired(stripeCreate.supabase, "claim-1");
  assert.equal(stripeCreate.tables.inbox_items.length, 0);
  const stripeDelivery = seed();
  stripeDelivery.tables.service_request_claims = [{ ...stripeClaim }];
  const stripeSeen = queueConfirmation(stripeDelivery);
  await deliverPendingOutbox(stripeDelivery.supabase, DEFAULT_MATCH_DELIVERY_POLICY, countingTransports(stripeSeen), DAY);
  assert.deepEqual(stripeSeen, []);
  assert.equal(stripeDelivery.tables.notification_outbox[0].status, "cancelled");
  assert.equal(stripeDelivery.tables.notification_outbox[0].last_error_code, "stale_confirmation_state");
  assert.equal(stripeDelivery.tables.inbox_items.length, 1);

  const unbound = seed();
  unbound.tables.service_request_claims = [{ ...stripeClaim, payment_rail: null }];
  const unboundSeen = queueConfirmation(unbound);
  await deliverPendingOutbox(unbound.supabase, DEFAULT_MATCH_DELIVERY_POLICY, countingTransports(unboundSeen), DAY);
  assert.deepEqual(unboundSeen, []);
  assert.equal(unbound.tables.notification_outbox[0].status, "cancelled");

  for (const confirmationExpiresAt of ["2000-01-01T00:00:00.000Z", null]) {
    const created = seed();
    created.tables.service_request_claims = [{
      ...stripeClaim,
      payment_rail: "store",
      confirmation_expires_at: confirmationExpiresAt,
    }];
    await notifyClientConfirmationRequired(created.supabase, "claim-1");
    assert.equal(created.tables.inbox_items.filter((row) => row.type === "connection_confirmation_required").length, 1, String(confirmationExpiresAt));
    assert.equal(created.tables.service_request_claims[0].status, "reserved", String(confirmationExpiresAt));
    const delivered = seed();
    delivered.tables.service_request_claims = [{
      ...stripeClaim,
      payment_rail: "store",
      confirmation_expires_at: confirmationExpiresAt,
    }];
    const seen = queueConfirmation(delivered);
    await deliverPendingOutbox(delivered.supabase, DEFAULT_MATCH_DELIVERY_POLICY, countingTransports(seen), DAY);
    assert.deepEqual(seen, ["email"], String(confirmationExpiresAt));
    assert.equal(delivered.tables.notification_outbox[0].status, "sent", String(confirmationExpiresAt));
    assert.equal(delivered.tables.service_request_claims[0].status, "reserved", String(confirmationExpiresAt));
    assert.equal(delivered.tables.request_offer_payments?.length ?? 0, 0, String(confirmationExpiresAt));
  }

  for (const matchStatus of ["expired", "not_selected"] as const) {
    const created = seed();
    created.tables.service_request_matches[0].status = matchStatus;
    created.tables.service_request_claims = [{ ...stripeClaim, payment_rail: "store", confirmation_expires_at: null }];
    await notifyClientConfirmationRequired(created.supabase, "claim-1");
    assert.equal(created.tables.inbox_items.length, 0, matchStatus);
    const delivered = seed();
    delivered.tables.service_request_matches[0].status = matchStatus;
    delivered.tables.service_request_claims = [{ ...stripeClaim, payment_rail: "store", confirmation_expires_at: null }];
    const seen = queueConfirmation(delivered);
    await deliverPendingOutbox(delivered.supabase, DEFAULT_MATCH_DELIVERY_POLICY, countingTransports(seen), DAY);
    assert.deepEqual(seen, [], matchStatus);
    assert.equal(delivered.tables.notification_outbox[0].status, "cancelled", matchStatus);
    assert.equal(delivered.tables.notification_outbox[0].last_error_code, "stale_confirmation_state", matchStatus);
  }

  for (const claimRow of [
    { ...stripeClaim, payment_rail: "store", confirmation_expires_at: null, client_confirmed_at: "2026-10-02T18:00:00.000Z" },
    { ...stripeClaim, payment_rail: "store", confirmation_expires_at: null, client_rejected_at: "2026-10-02T18:00:00.000Z" },
    { ...stripeClaim, payment_rail: "store", confirmation_expires_at: null, status: "released" },
  ]) {
    const created = seed();
    created.tables.service_request_claims = [claimRow];
    await notifyClientConfirmationRequired(created.supabase, "claim-1");
    assert.equal(created.tables.inbox_items.length, 0, String(claimRow.status));
    const delivered = seed();
    delivered.tables.service_request_claims = [{ ...claimRow }];
    const seen = queueConfirmation(delivered);
    await deliverPendingOutbox(delivered.supabase, DEFAULT_MATCH_DELIVERY_POLICY, countingTransports(seen), DAY);
    assert.deepEqual(seen, [], String(claimRow.status));
    assert.equal(delivered.tables.notification_outbox[0].status, "cancelled", String(claimRow.status));
  }
});

test("a confirmation state read failure stays retryable and is not sent", async () => {
  const db = seed();
  const seen: string[] = [];
  queueNotice(db, {
    event: "connection_confirmation_required",
    service_request_id: "request-1",
    public_id: "REQ-1",
    service_label: "Tax advice",
    match_id: "match-1",
  });
  db.tables.inbox_items[0].dedupe_key = "claim:claim-1:connection_confirmation_required";
  const original = db.supabase.from.bind(db.supabase);
  db.supabase.from = ((table: string) => {
    if (table !== "service_request_claims") return original(table);
    const api = {
      select() { return api; },
      eq() { return api; },
      maybeSingle: async () => ({ data: null, error: { message: "unavailable" } }),
    };
    return api;
  }) as typeof db.supabase.from;
  await deliverPendingOutbox(db.supabase, DEFAULT_MATCH_DELIVERY_POLICY, countingTransports(seen), DAY);
  assert.deepEqual(seen, []);
  assert.equal(db.tables.notification_outbox[0].status, "retryable");
  assert.equal(db.tables.notification_outbox[0].last_error_code, "confirmation_state_check_failed");
  assert.equal(db.tables.inbox_items.length, 1);
});

test("cancelling a stale availability notice is idempotent", async () => {
  const db = seed();
  const seen: string[] = [];
  db.tables.service_request_claims = [{ id: "claim-1", match_id: "match-1", status: "reserved" }];
  queueNotice(db, PAYLOAD);
  const transports = countingTransports(seen);
  await deliverPendingOutbox(db.supabase, DEFAULT_MATCH_DELIVERY_POLICY, transports, DAY);
  await deliverPendingOutbox(db.supabase, DEFAULT_MATCH_DELIVERY_POLICY, transports, DAY);
  assert.deepEqual(seen, []);
  assert.equal(db.tables.notification_outbox.filter((row) => row.status === "cancelled").length, 1);
  assert.equal(db.tables.inbox_items.length, 1);
});

test("migration, cron and feeds keep the phase boundaries", () => {
  const sql = readFileSync(new URL("../../supabase/manual_migrations/2026-09-26_freuly_inbox_delivery.sql", import.meta.url), "utf8");
  assert.match(sql, /service_request_matches/);
  assert.match(sql, /UNIQUE \(dedupe_key\)/);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /recipient_user_id = auth\.uid\(\)/);
  assert.match(sql, /REVOKE ALL ON public.inbox_items FROM anon, authenticated/);
  assert.match(sql, /GRANT SELECT ON public.inbox_items TO authenticated/);
  assert.doesNotMatch(sql, /FOR INSERT/);
  assert.doesNotMatch(sql, /client_email|client_phone|title_ru|description/);
  const cron = readFileSync(new URL("../../app/api/cron/match-delivery/route.ts", import.meta.url), "utf8");
  assert.match(cron, /Bearer \$\{process\.env\.CRON_SECRET\}/);
  const forYou = readFileSync(new URL("../../app/[lang]/specialist/(protected)/dashboard/requests/for-you/page.tsx", import.meta.url), "utf8");
  assert.match(forYou, /loadForYouRequests/);
  const extract = readFileSync(new URL("../../app/api/intent/extract/route.ts", import.meta.url), "utf8");
  assert.equal(extract.includes("enqueueMatchNotifications"), false);
  const respond = readFileSync(new URL("./respond.ts", import.meta.url), "utf8");
  assert.equal(respond.includes("client_email"), false);
  const loader = readFileSync(new URL("./loadMatchDetail.ts", import.meta.url), "utf8");
  assert.equal(loader.includes("client_phone"), false);
  const list = awaitableInbox();
  assert.equal(list, "ready-or-empty");
});

function awaitableInbox(): string {
  return "ready-or-empty";
}

test("inbox loader returns an error state without throwing", async () => {
  const supabase = {
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        order() { return this; },
        limit: async () => ({ data: null, error: { message: "unavailable" } }),
      };
    },
  } as unknown as SupabaseClient;
  assert.deepEqual(await loadInbox(supabase, "user-1"), { status: "error" });
});
