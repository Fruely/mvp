import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deliverPendingOutbox } from "@/lib/inbox/delivery";
import { DEFAULT_MATCH_DELIVERY_POLICY } from "@/lib/inbox/policy";
import { respondToOwnMatch } from "@/lib/inbox/respond";
import { findAccessGrant, issueAccessToken, resolveAccessToken, revokeAccessToken } from "./accessGrant";
import { hashAccessToken } from "./accessToken";
import { scheduleClientReminders } from "./interest";
import { normalizeMessageBody } from "./messages";
import { clientRequestPhase, conversationRole, selectionDecision } from "./policy";
import { previewHasPrivateFields, toPublicSpecialistPreview } from "./preview";
import { clientEventPushContract, pushContractHasPrivateContact } from "./pushContract";
import { renderClientEvent } from "./render";
import { selectInterestedSpecialist } from "./selectSpecialist";
import { loadConversationForViewer, loadOwnedRequestView, type Viewer } from "./view";

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

function specialist(id: string, userId: string) {
  return {
    id,
    user_id: userId,
    name: id === "specialist-1" ? "Anna M." : "Boris K.",
    avatar_url: null,
    languages: ["ru", "de"],
    work_format: "online",
    status: "featured_verified",
    category_id: "cat-1",
    email: `${id}@private.example`,
    phone: "+49111222333",
    telegram_chat_id: "900",
    notification_locale: "de",
  };
}

function seed() {
  return memory({
    service_requests: [{
      id: "request-1",
      public_id: "REQ-1",
      client_user_id: "user-client",
      status: "searching",
      selected_specialist_id: null,
      selected_at: null,
      requested_service: "Tax advice",
      category_text: null,
      description: "Need tax help",
      locale: "ua",
      client_email: null,
      client_phone: "+490000",
      first_specialist_response_at: null,
    }, {
      id: "request-2",
      public_id: "REQ-2",
      client_user_id: "user-other",
      status: "searching",
      selected_specialist_id: null,
      selected_at: null,
      requested_service: "Other",
      category_text: null,
      description: "Other task",
      locale: "de",
      client_email: null,
      first_specialist_response_at: null,
    }],
    service_request_matches: [{
      id: "match-1",
      specialist_id: "specialist-1",
      service_request_id: "request-1",
      status: "active",
    }, {
      id: "match-2",
      specialist_id: "specialist-2",
      service_request_id: "request-1",
      status: "active",
    }, {
      id: "match-3",
      specialist_id: "specialist-1",
      service_request_id: "request-2",
      status: "interested",
    }],
    specialists: [specialist("specialist-1", "user-specialist"), specialist("specialist-2", "user-specialist-2")],
    specialist_profiles: [
      { specialist_id: "specialist-1", city: "Berlin" },
      { specialist_id: "specialist-2", city: "Hamburg" },
    ],
    categories: [{ id: "cat-1", slug: "tax", title: "Tax", title_ru: "Налоги", title_ua: "Податки", title_de: "Steuern" }],
    inbox_items: [],
    notification_outbox: [],
    conversations: [],
    conversation_messages: [],
    service_request_access_tokens: [],
    notification_delivery_attempts: [],
  });
}

function owner(): Viewer {
  return { actorUserId: "user-client", actorSpecialistId: null, anonymousRequestId: null };
}

test("1-2. interested creates one client event and repeating it does not", async () => {
  const db = seed();
  const first = await respondToOwnMatch(db.supabase, {
    matchId: "match-1",
    specialistId: "specialist-1",
    userId: "user-specialist",
    response: "interested",
  });
  const second = await respondToOwnMatch(db.supabase, {
    matchId: "match-1",
    specialistId: "specialist-1",
    userId: "user-specialist",
    response: "interested",
  });
  const events = db.tables.inbox_items.filter((row) => row.type === "specialist_interested");
  assert.equal("changed" in first && first.changed, true);
  assert.equal("changed" in second && second.changed, false);
  assert.equal(events.length, 1);
  assert.equal(events[0].dedupe_key, "match:match-1:specialist_interested");
  assert.equal(typeof db.tables.service_requests[0].first_specialist_response_at, "string");
});

test("3. declined creates no client interested event", async () => {
  const db = seed();
  await respondToOwnMatch(db.supabase, {
    matchId: "match-1",
    specialistId: "specialist-1",
    userId: "user-specialist",
    response: "declined",
  });
  assert.equal(db.tables.inbox_items.filter((row) => row.type === "specialist_interested").length, 0);
  assert.equal(db.tables.service_request_matches[0].status, "declined");
});

test("4-6. client sees interested specialists on their request only", async () => {
  const db = seed();
  db.tables.service_request_matches[0].status = "interested";
  db.tables.service_request_matches[1].status = "declined";
  const view = await loadOwnedRequestView(db.supabase, { publicId: "REQ-1", viewer: owner(), locale: "ua" });
  assert.equal("cards" in view, true);
  if (!("cards" in view)) return;
  assert.equal(view.cards.length, 1);
  assert.equal(view.cards[0].id, "specialist-1");
  assert.equal(view.cards.some((card) => card.id === "specialist-2"), false);
  const foreign = await loadOwnedRequestView(db.supabase, { publicId: "REQ-2", viewer: owner(), locale: "ua" });
  assert.deepEqual(foreign, { error: "forbidden" });
});

test("7-8. public preview and external notice omit private contacts", async () => {
  const preview = toPublicSpecialistPreview({
    id: "specialist-1",
    name: "Anna M.",
    avatarUrl: null,
    category: "Податки",
    languages: ["ru", "de"],
    workFormat: "online",
    city: "Berlin",
    status: "featured_verified",
    locale: "ua",
  });
  assert.equal(preview.city, null);
  assert.equal(preview.verification, "verified");
  assert.equal(previewHasPrivateFields(preview), false);
  assert.equal(JSON.stringify(preview).includes("telegram"), false);

  const db = seed();
  db.tables.service_requests[0].client_email = "client@example.com";
  db.tables.service_request_matches[0].status = "interested";
  db.tables.service_request_matches[1].status = "interested";
  db.tables.inbox_items.push({
    id: "inbox-client",
    payload: {
      event: "specialist_interested",
      service_request_id: "request-1",
      public_id: "REQ-1",
      service_label: "Tax advice",
      match_id: "match-1",
      specialist_id: "specialist-1",
    },
  });
  db.tables.notification_outbox.push({
    id: "out-email",
    inbox_item_id: "inbox-client",
    channel: "email",
    status: "pending",
    attempt_count: 0,
    match_id: null,
    recipient_user_id: "user-client",
    next_attempt_at: "2026-09-26T09:00:00.000Z",
  });
  const seen: Array<{ title: string; body: string; link: string; locale: string }> = [];
  await deliverPendingOutbox(db.supabase, DEFAULT_MATCH_DELIVERY_POLICY, {
    push: async () => ({ status: "skipped", providerMessageId: null, errorCode: "push_not_configured" }),
    telegram: async () => ({ status: "skipped", providerMessageId: null, errorCode: "telegram_unavailable" }),
    email: async (input) => {
      seen.push({
        title: input.prepared?.title ?? "",
        body: input.prepared?.body ?? "",
        link: input.link,
        locale: input.locale,
      });
      return { status: "sent", providerMessageId: "mail-1", errorCode: null };
    },
  }, new Date("2026-09-26T10:00:00.000Z"));
  assert.equal(seen.length, 1);
  const notice = JSON.stringify(seen[0]);
  assert.equal(notice.includes("client@example.com"), false);
  assert.equal(notice.includes("+490000"), false);
  assert.equal(notice.includes("telegram"), false);
  assert.equal(seen[0].locale, "ua");
  assert.equal(seen[0].title, renderClientEvent("ua", "specialist_interested", { count: 2 }).title);
  assert.notEqual(seen[0].title, renderClientEvent("de", "specialist_interested", { count: 2 }).title);
});

test("9-10. client locale controls the client notice", () => {
  const client = renderClientEvent("ua", "specialist_interested", { count: 1, serviceLabel: "Tax advice" });
  const specialist = renderClientEvent("de", "client_selected_you", { serviceLabel: "Tax advice" });
  assert.equal(client.title, "Спеціаліст готовий допомогти");
  assert.equal(specialist.title, "Der Kunde hat Sie ausgewählt");
  assert.equal(renderClientEvent("en", "connection_ready", {}).title.includes("You chose"), true);
});

test("interest bursts share one external digest", async () => {
  const db = seed();
  db.tables.service_request_matches[0].status = "interested";
  db.tables.service_request_matches[1].status = "interested";
  const { recordSpecialistInterest } = await import("./interest");
  await recordSpecialistInterest(db.supabase, { matchId: "match-1", specialistId: "specialist-1", requestId: "request-1" });
  await recordSpecialistInterest(db.supabase, { matchId: "match-2", specialistId: "specialist-2", requestId: "request-1" });
  const events = db.tables.inbox_items.filter((row) => row.type === "specialist_interested");
  const digests = db.tables.notification_outbox.filter((row) => String(row.dedupe_key).includes("interest_digest"));
  assert.equal(events.length, 2);
  assert.equal(digests.length, 3);
  assert.equal(JSON.stringify(events).includes("client_phone"), false);
  assert.equal(JSON.stringify(events).includes("client_email"), false);
});

test("11-16. only the owner can select an interested specialist on that request", async () => {
  const db = seed();
  db.tables.service_request_matches[0].status = "interested";
  db.tables.service_request_matches[1].status = "declined";
  const declined = await selectInterestedSpecialist(db.supabase, {
    requestId: "request-1",
    specialistId: "specialist-2",
    actorUserId: "user-client",
    anonymousAccess: false,
  });
  assert.deepEqual(declined, { ok: false, error: "not_selectable" });
  const missing = await selectInterestedSpecialist(db.supabase, {
    requestId: "request-1",
    specialistId: "specialist-missing",
    actorUserId: "user-client",
    anonymousAccess: false,
  });
  assert.deepEqual(missing, { ok: false, error: "not_selectable" });
  db.tables.service_request_matches.push({
    id: "match-foreign",
    specialist_id: "specialist-foreign",
    service_request_id: "request-2",
    status: "interested",
  });
  const foreignSpecialist = await selectInterestedSpecialist(db.supabase, {
    requestId: "request-1",
    specialistId: "specialist-foreign",
    actorUserId: "user-client",
    anonymousAccess: false,
  });
  assert.deepEqual(foreignSpecialist, { ok: false, error: "not_selectable" });
  const otherOwner = await selectInterestedSpecialist(db.supabase, {
    requestId: "request-1",
    specialistId: "specialist-1",
    actorUserId: "user-other",
    anonymousAccess: false,
  });
  assert.deepEqual(otherOwner, { ok: false, error: "forbidden" });
  assert.equal(db.tables.service_requests[0].selected_specialist_id, null);
  const selected = await selectInterestedSpecialist(db.supabase, {
    requestId: "request-1",
    specialistId: "specialist-1",
    actorUserId: "user-client",
    anonymousAccess: false,
  });
  assert.equal(selected.ok, true);
  if (!selected.ok) return;
  assert.equal(selected.changed, true);
  assert.equal(typeof selected.selectedAt, "string");
  assert.equal(db.tables.service_requests[0].status, "matched");
  assert.equal(db.tables.service_requests[0].selected_specialist_id, "specialist-1");
});

test("16-20. a second selection click is one conversation and one specialist notice", async () => {
  const db = seed();
  db.tables.service_request_matches[0].status = "interested";
  const input = {
    requestId: "request-1",
    specialistId: "specialist-1",
    actorUserId: "user-client",
    anonymousAccess: false,
  };
  const first = await selectInterestedSpecialist(db.supabase, input);
  const second = await selectInterestedSpecialist(db.supabase, input);
  assert.equal(first.ok && second.ok && first.conversationId === second.conversationId, true);
  assert.equal(second.ok && second.changed, false);
  assert.equal(db.tables.conversations.length, 1);
  assert.equal(db.tables.inbox_items.filter((row) => row.type === "client_selected_you").length, 1);
  const notice = db.tables.inbox_items.find((row) => row.type === "client_selected_you");
  assert.equal(notice?.recipient_user_id, "user-specialist");
  assert.equal(JSON.stringify(notice?.payload).includes("client_phone"), false);
  assert.equal(JSON.stringify(notice?.payload).includes("@"), false);
});

test("17. concurrent selection keeps a single specialist", async () => {
  const db = seed();
  db.tables.service_request_matches[0].status = "interested";
  db.tables.service_request_matches[1].status = "interested";
  const [left, right] = await Promise.all([
    selectInterestedSpecialist(db.supabase, {
      requestId: "request-1",
      specialistId: "specialist-1",
      actorUserId: "user-client",
      anonymousAccess: false,
    }),
    selectInterestedSpecialist(db.supabase, {
      requestId: "request-1",
      specialistId: "specialist-2",
      actorUserId: "user-client",
      anonymousAccess: false,
    }),
  ]);
  const winners = [left, right].filter((result) => result.ok && result.changed);
  assert.equal(winners.length, 1);
  assert.equal([left, right].some((result) => !result.ok && result.error === "already_selected"), true);
  assert.equal(db.tables.conversations.length, 1);
  const selected = db.tables.service_request_matches.filter((row) => row.status === "selected");
  assert.equal(selected.length, 1);
});

test("21-23. selection stops other responses and keeps history", async () => {
  const db = seed();
  db.tables.service_request_matches[0].status = "interested";
  db.tables.service_request_matches.push({
    id: "match-4",
    specialist_id: "specialist-2",
    service_request_id: "request-1",
    status: "declined",
  });
  db.tables.service_request_matches[1].status = "active";
  db.tables.notification_outbox.push({
    id: "reminder",
    match_id: "match-2",
    status: "pending",
    channel: "telegram",
  });
  await selectInterestedSpecialist(db.supabase, {
    requestId: "request-1",
    specialistId: "specialist-1",
    actorUserId: "user-client",
    anonymousAccess: false,
  });
  assert.equal(db.tables.service_request_matches.find((row) => row.id === "match-1")?.status, "selected");
  assert.equal(db.tables.service_request_matches.find((row) => row.id === "match-2")?.status, "not_selected");
  assert.equal(db.tables.service_request_matches.find((row) => row.id === "match-4")?.status, "declined");
  assert.equal(db.tables.notification_outbox.find((row) => row.id === "reminder")?.status, "cancelled");
  assert.equal(db.tables.service_request_matches.length, 4);
});

test("24-32. one conversation is visible only to its participants", async () => {
  const db = seed();
  db.tables.service_request_matches[0].status = "interested";
  const selected = await selectInterestedSpecialist(db.supabase, {
    requestId: "request-1",
    specialistId: "specialist-1",
    actorUserId: "user-client",
    anonymousAccess: false,
  });
  assert.equal(selected.ok, true);
  if (!selected.ok) return;
  const again = await selectInterestedSpecialist(db.supabase, {
    requestId: "request-1",
    specialistId: "specialist-1",
    actorUserId: "user-client",
    anonymousAccess: false,
  });
  assert.equal(again.ok && again.changed, false);
  assert.equal(db.tables.conversations.length, 1);
  assert.equal(db.tables.conversation_messages.length, 1);
  const system = db.tables.conversation_messages[0];
  assert.equal(system.kind, "system");
  assert.equal(system.actor_type, "system");
  assert.equal(system.author_user_id, null);
  assert.equal(system.body, null);
  assert.equal(JSON.stringify(system.payload).includes("client_phone"), false);
  assert.equal(JSON.stringify(system.payload).includes("@"), false);

  const client = await loadConversationForViewer(db.supabase, {
    conversationId: selected.conversationId,
    viewer: owner(),
  });
  const chosen = await loadConversationForViewer(db.supabase, {
    conversationId: selected.conversationId,
    viewer: { actorUserId: "user-specialist", actorSpecialistId: "specialist-1", anonymousRequestId: null },
  });
  const stranger = await loadConversationForViewer(db.supabase, {
    conversationId: selected.conversationId,
    viewer: { actorUserId: "user-other", actorSpecialistId: "specialist-2", anonymousRequestId: null },
  });
  const anon = await loadConversationForViewer(db.supabase, {
    conversationId: selected.conversationId,
    viewer: { actorUserId: null, actorSpecialistId: null, anonymousRequestId: null },
  });
  assert.equal(client?.role, "client");
  assert.equal(chosen?.role, "specialist");
  assert.equal(stranger, null);
  assert.equal(anon, null);
  assert.equal(conversationRole({
    clientUserId: "user-client",
    specialistId: "specialist-1",
    requestId: "request-1",
    actorUserId: null,
    actorSpecialistId: null,
    anonymousRequestId: "request-1",
  }), null);
});

test("anonymous capability is hashed, scoped, and revocable", async () => {
  const db = seed();
  db.tables.service_requests[0].client_user_id = null;
  const now = new Date("2026-09-26T12:00:00.000Z");
  const token = await issueAccessToken(db.supabase, "request-1", now);
  assert.equal(typeof token, "string");
  if (!token) return;
  const stored = db.tables.service_request_access_tokens[0];
  assert.equal(stored.token_hash, hashAccessToken(token));
  assert.equal(JSON.stringify(stored).includes(token), false);
  assert.equal(await resolveAccessToken(db.supabase, token, "request-1", now), "valid");
  assert.equal(await resolveAccessToken(db.supabase, token, "request-2", now), "wrong_request");
  assert.equal(await resolveAccessToken(db.supabase, "not-a-token", "request-1", now), "invalid");
  const view = await loadOwnedRequestView(db.supabase, {
    publicId: "REQ-1",
    viewer: { actorUserId: null, actorSpecialistId: null, anonymousRequestId: "request-1" },
    locale: "ua",
  });
  assert.equal("cards" in view, true);
  const denied = await loadOwnedRequestView(db.supabase, {
    publicId: "REQ-2",
    viewer: { actorUserId: null, actorSpecialistId: null, anonymousRequestId: "request-1" },
    locale: "de",
  });
  assert.deepEqual(denied, { error: "forbidden" });
  stored.expires_at = "2020-01-01T00:00:00.000Z";
  assert.equal(await resolveAccessToken(db.supabase, token, "request-1", now), "expired");
  stored.expires_at = "2026-10-26T12:00:00.000Z";
  await revokeAccessToken(db.supabase, String(stored.token_hash), now);
  assert.equal(await resolveAccessToken(db.supabase, token, "request-1", now), "revoked");
  const grant = await findAccessGrant(db.supabase, token, now);
  assert.equal(grant.verdict, "revoked");
});

test("anonymous owner can select and a stranger auth user cannot", async () => {
  const db = seed();
  db.tables.service_requests[0].client_user_id = null;
  db.tables.service_request_matches[0].status = "interested";
  const stranger = await selectInterestedSpecialist(db.supabase, {
    requestId: "request-1",
    specialistId: "specialist-1",
    actorUserId: "user-other",
    anonymousAccess: false,
  });
  assert.deepEqual(stranger, { ok: false, error: "forbidden" });
  const ownerSelect = await selectInterestedSpecialist(db.supabase, {
    requestId: "request-1",
    specialistId: "specialist-1",
    actorUserId: null,
    anonymousAccess: true,
  });
  assert.equal(ownerSelect.ok, true);
  assert.equal(selectionDecision({
    requestClientUserId: "user-client",
    actorUserId: "user-other",
    anonymousAccess: false,
    requestStatus: "searching",
    selectedSpecialistId: null,
    specialistId: "specialist-1",
    matchStatus: "interested",
  }).ok, false);
});

test("lifecycle, reminder and push contract stay recipient-scoped", async () => {
  assert.equal(clientRequestPhase({ status: "searching", interestedCount: 0, selected: false, connected: false }), "searching");
  assert.equal(clientRequestPhase({ status: "searching", interestedCount: 2, selected: false, connected: false }), "responses_received");
  assert.equal(clientRequestPhase({ status: "matched", interestedCount: 2, selected: true, connected: true }), "connected");
  assert.equal(clientRequestPhase({ status: "closed", interestedCount: 1, selected: true, connected: true }), "completed");
  const contract = clientEventPushContract({
    locale: "ua",
    event: "client_selected_you",
    entityId: "match-1",
    link: "https://freuly.de/ua/specialist/dashboard/conversations/conversation-1",
    serviceLabel: "Tax advice",
  });
  assert.equal(contract.locale, "ua");
  assert.equal(pushContractHasPrivateContact(contract, "client@example.com"), false);
  assert.equal(normalizeMessageBody("  hello  "), "hello");
  assert.equal(normalizeMessageBody(""), null);

  const db = seed();
  db.tables.service_requests[0].first_specialist_response_at = "2026-09-26T00:00:00.000Z";
  const due = await scheduleClientReminders(db.supabase, new Date("2026-09-26T12:00:00.000Z"));
  const repeat = await scheduleClientReminders(db.supabase, new Date("2026-09-26T12:00:00.000Z"));
  assert.equal(due.scheduled, 1);
  assert.equal(repeat.scheduled, 0);
  db.tables.service_requests[0].selected_at = "2026-09-26T11:00:00.000Z";
  db.tables.inbox_items = db.tables.inbox_items.filter((row) => row.type !== "client_reminder");
  const afterSelect = await scheduleClientReminders(db.supabase, new Date("2026-09-26T12:00:00.000Z"));
  assert.equal(afterSelect.scheduled, 0);
});

test("phase 5 migration follows the inbox migration and keeps access private", () => {
  const sql = readFileSync(new URL("../../supabase/manual_migrations/2026-09-26_client_selection.sql", import.meta.url), "utf8");
  assert.match(sql, /2026-09-26_freuly_inbox_delivery\.sql/);
  assert.match(sql, /service_request_matches_one_selected/);
  assert.match(sql, /first_specialist_response_at/);
  assert.match(sql, /selected_at/);
  assert.match(sql, /REVOKE ALL ON public\.service_request_access_tokens FROM anon, authenticated/);
  assert.match(sql, /REVOKE ALL ON public\.conversations FROM anon, authenticated/);
  assert.match(sql, /client_user_id = auth\.uid\(\)/);
  assert.match(sql, /kind = 'system' AND body IS NULL/);
  assert.equal(sql.includes("title_ru"), false);
  assert.equal(sql.includes("title_ua"), false);
  assert.equal(sql.includes("title_de"), false);
});
