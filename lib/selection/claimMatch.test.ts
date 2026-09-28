import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { respondToOwnMatch } from "../inbox/respond.ts";
import { renderClientEvent } from "./render.ts";
import { claimOwnMatch } from "./claimMatch.ts";
import {
  specialistLeadSessionErrorCode,
  specialistLeadSessionErrorStatus,
} from "../specialistLeads/session.ts";

type Row = Record<string, unknown>;

const REQUEST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MATCH_A = "11111111-1111-4111-8111-111111111111";
const MATCH_B = "22222222-2222-4222-8222-222222222222";
const MATCH_C = "33333333-3333-4333-8333-333333333333";
const MATCH_D = "44444444-4444-4444-8444-444444444444";
const A = "specialist-a";
const B = "specialist-b";
const C = "specialist-c";
const D = "specialist-d";

function memory(seed: Record<string, Row[]>, options?: { declineWinnerOnOwnerCommit?: boolean }) {
  const tables: Record<string, Row[]> = {};
  for (const [name, rows] of Object.entries(seed)) tables[name] = rows.map((row) => ({ ...row }));
  const ensure = (name: string) => {
    if (!tables[name]) tables[name] = [];
    return tables[name];
  };
  function from(table: string) {
    const filters: Array<(row: Row) => boolean> = [];
    let patch: Row | null = null;
    const matched = () => ensure(table).filter((row) => filters.every((filter) => filter(row)));
    const apply = async () => {
      const rows = matched();
      if (patch) {
        for (const row of rows) Object.assign(row, patch);
        if (
          options?.declineWinnerOnOwnerCommit &&
          table === "service_requests" &&
          typeof patch.selected_specialist_id === "string"
        ) {
          for (const row of ensure("service_request_matches")) {
            if (row.specialist_id === patch.selected_specialist_id && row.status === "active") row.status = "declined";
          }
        }
      }
      return { data: rows.map((row) => ({ ...row })), error: null };
    };
    const api = {
      select() {
        return api;
      },
      eq(column: string, value: unknown) {
        filters.push((row) => row[column] === value);
        return api;
      },
      neq(column: string, value: unknown) {
        filters.push((row) => row[column] !== value);
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
        };
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
  return { supabase: { from } as unknown as SupabaseClient, tables };
}

function seed(overrides?: { request?: Row; matches?: Row[]; conversations?: Row[] }) {
  return memory({
    service_requests: [
      {
        id: REQUEST,
        status: "new",
        selected_specialist_id: null,
        public_id: "REQ-20260928-CLAIM01",
        client_user_id: "client-user",
        client_email: "hidden@example.test",
        client_name: "Hidden",
        client_phone: "+491511234567",
        requested_service: "психолог",
        category_text: "Психологи",
        ...overrides?.request,
      },
    ],
    service_request_matches: overrides?.matches ?? [
      { id: MATCH_A, specialist_id: A, service_request_id: REQUEST, status: "active", responded_at: null, opened_at: null },
      { id: MATCH_B, specialist_id: B, service_request_id: REQUEST, status: "active", responded_at: null, opened_at: null },
      { id: MATCH_C, specialist_id: C, service_request_id: REQUEST, status: "interested", responded_at: null, opened_at: null },
      { id: MATCH_D, specialist_id: D, service_request_id: REQUEST, status: "declined", responded_at: "2026-09-28T00:00:00.000Z", opened_at: null },
    ],
    notification_outbox: [
      { id: "out-b", match_id: MATCH_B, status: "pending" },
      { id: "out-c", match_id: MATCH_C, status: "retryable" },
      { id: "out-d", match_id: MATCH_D, status: "sent" },
    ],
    conversations: overrides?.conversations ?? [],
    conversation_messages: [],
    inbox_items: [],
    specialists: [{ id: A, user_id: "user-a", email: "a@example.test", telegram_chat_id: null }],
  });
}

test("owner claim selects the match, owns the request, and opens one conversation", async () => {
  const db = seed();
  const result = await claimOwnMatch(db.supabase, { matchId: MATCH_A, specialistId: A });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.changed, true);
  assert.equal(typeof result.conversationId, "string");
  assert.equal(db.tables.service_requests[0].selected_specialist_id, A);
  assert.equal(db.tables.service_requests[0].status, "matched");
  assert.equal(db.tables.service_request_matches.find((row) => row.id === MATCH_A)?.status, "selected");
  assert.equal(db.tables.service_request_matches.find((row) => row.id === MATCH_B)?.status, "not_selected");
  assert.equal(db.tables.service_request_matches.find((row) => row.id === MATCH_C)?.status, "not_selected");
  assert.equal(db.tables.service_request_matches.find((row) => row.id === MATCH_D)?.status, "declined");
  assert.equal(db.tables.notification_outbox.find((row) => row.id === "out-b")?.status, "cancelled");
  assert.equal(db.tables.notification_outbox.find((row) => row.id === "out-c")?.status, "cancelled");
  assert.equal(db.tables.notification_outbox.find((row) => row.id === "out-d")?.status, "sent");
  assert.equal(db.tables.conversations.length, 1);
  assert.equal(db.tables.conversations[0].specialist_id, A);
  assert.equal(db.tables.conversations[0].client_user_id, "client-user");
  const serialized = JSON.stringify({ result, notices: db.tables.inbox_items, messages: db.tables.conversation_messages });
  assert.equal(serialized.includes("hidden@example.test"), false);
  assert.equal(serialized.includes("client_phone"), false);
  assert.equal(serialized.includes("Hidden"), false);
  assert.equal(db.tables.inbox_items.some((row) => row.type === "connection_ready"), true);
  assert.equal(db.tables.inbox_items.some((row) => row.type === "client_selected_you"), false);
  assert.equal(db.tables.inbox_items.some((row) => row.type === "specialist_interested"), false);
  const notice = renderClientEvent("ru", "connection_ready", { serviceLabel: "психолог" });
  assert.equal(notice.title.includes("найден"), true);
  assert.equal(notice.title.includes("выбрали"), false);
});

test("winner retry returns the same conversation and repairs an incomplete claim", async () => {
  const db = seed({
    request: { selected_specialist_id: A, selected_at: "2026-09-28T01:00:00.000Z", status: "matched" },
  });
  const first = await claimOwnMatch(db.supabase, { matchId: MATCH_A, specialistId: A });
  const second = await claimOwnMatch(db.supabase, { matchId: MATCH_A, specialistId: A });
  assert.equal(first.ok && second.ok && first.conversationId === second.conversationId, true);
  assert.equal(second.ok && second.changed, false);
  assert.equal(db.tables.conversations.length, 1);
  assert.equal(db.tables.service_request_matches.find((row) => row.id === MATCH_A)?.status, "selected");
  assert.equal(db.tables.service_request_matches.find((row) => row.id === MATCH_B)?.status, "not_selected");
});

test("a second specialist cannot claim and does not get a conversation", async () => {
  const db = seed();
  const winner = await claimOwnMatch(db.supabase, { matchId: MATCH_A, specialistId: A });
  const loser = await claimOwnMatch(db.supabase, { matchId: MATCH_B, specialistId: B });
  assert.equal(winner.ok, true);
  assert.deepEqual(loser, { ok: false, error: "already_claimed" });
  assert.equal(db.tables.conversations.length, 1);
  assert.equal(db.tables.conversations[0].specialist_id, A);
  assert.equal(db.tables.inbox_items.filter((row) => row.type === "connection_ready").length, 1);
});

test("concurrent conditional claims keep a single winner", async () => {
  const db = seed();
  const [left, right] = await Promise.all([
    claimOwnMatch(db.supabase, { matchId: MATCH_A, specialistId: A }),
    claimOwnMatch(db.supabase, { matchId: MATCH_B, specialistId: B }),
  ]);
  const results = [left, right];
  assert.equal(results.filter((result) => result.ok).length, 1);
  assert.equal(results.filter((result) => !result.ok && result.error === "already_claimed").length, 1);
  const winner = db.tables.service_requests[0].selected_specialist_id;
  assert.equal(winner === A || winner === B, true);
  assert.equal(db.tables.service_request_matches.filter((row) => row.status === "selected").length, 1);
  assert.equal(db.tables.conversations.length, 1);
  assert.equal(db.tables.conversations[0].specialist_id, winner);
});

test("foreign, declined, and not_selected matches cannot start a claim", async () => {
  const db = seed();
  const foreign = await claimOwnMatch(db.supabase, { matchId: MATCH_A, specialistId: B });
  assert.deepEqual(foreign, { ok: false, error: "forbidden" });
  assert.equal(db.tables.service_requests[0].selected_specialist_id, null);
  assert.equal(db.tables.conversations.length, 0);

  const declined = await claimOwnMatch(db.supabase, { matchId: MATCH_D, specialistId: D });
  assert.deepEqual(declined, { ok: false, error: "not_claimable" });

  db.tables.service_request_matches.find((row) => row.id === MATCH_B)!.status = "not_selected";
  const closed = await claimOwnMatch(db.supabase, { matchId: MATCH_B, specialistId: B });
  assert.deepEqual(closed, { ok: false, error: "not_claimable" });
  assert.equal(db.tables.conversations.length, 0);
});

test("claim and decline leave one terminal state", async () => {
  const claimed = seed();
  const won = await claimOwnMatch(claimed.supabase, { matchId: MATCH_A, specialistId: A });
  assert.equal(won.ok, true);
  const after = await respondToOwnMatch(claimed.supabase, {
    matchId: MATCH_A,
    specialistId: A,
    userId: "user-a",
    response: "declined",
  });
  assert.equal("status" in after && after.status, "selected");
  assert.equal("changed" in after && after.changed, false);
  assert.equal(claimed.tables.service_request_matches.find((row) => row.id === MATCH_A)?.status, "selected");

  const declinedFirst = seed();
  const pass = await respondToOwnMatch(declinedFirst.supabase, {
    matchId: MATCH_A,
    specialistId: A,
    userId: "user-a",
    response: "declined",
  });
  assert.equal("status" in pass && pass.status, "declined");
  const late = await claimOwnMatch(declinedFirst.supabase, { matchId: MATCH_A, specialistId: A });
  assert.deepEqual(late, { ok: false, error: "not_claimable" });
  assert.equal(declinedFirst.tables.service_requests[0].selected_specialist_id, null);
  assert.equal(declinedFirst.tables.conversations.length, 0);

  const raced = memory(seed().tables, { declineWinnerOnOwnerCommit: true });
  const interrupted = await claimOwnMatch(raced.supabase, { matchId: MATCH_A, specialistId: A });
  assert.deepEqual(interrupted, { ok: false, error: "not_claimable" });
  assert.equal(raced.tables.service_requests[0].selected_specialist_id, null);
  assert.equal(raced.tables.service_requests[0].status, "new");
  assert.equal(raced.tables.conversations.length, 0);
});

test("a conversation for a different specialist is not returned", async () => {
  const db = seed({
    request: { selected_specialist_id: A, status: "matched" },
    matches: [
      { id: MATCH_A, specialist_id: A, service_request_id: REQUEST, status: "selected" },
    ],
    conversations: [
      { id: "conv-other", service_request_id: REQUEST, specialist_id: B, client_user_id: "client-user", status: "open" },
    ],
  });
  const result = await claimOwnMatch(db.supabase, { matchId: MATCH_A, specialistId: A });
  assert.deepEqual(result, { ok: false, error: "invariant" });
  assert.equal(JSON.stringify(result).includes("conv-other"), false);
});

test("a declined match is not repaired into selected for the current owner", async () => {
  const db = seed({
    request: { selected_specialist_id: A, status: "matched" },
    matches: [{ id: MATCH_A, specialist_id: A, service_request_id: REQUEST, status: "declined" }],
  });
  const result = await claimOwnMatch(db.supabase, { matchId: MATCH_A, specialistId: A });
  assert.deepEqual(result, { ok: false, error: "not_claimable" });
  assert.equal(db.tables.service_request_matches[0].status, "declined");
  assert.equal(db.tables.conversations.length, 0);
});

test("claim route uses the session specialist and rejects absent or blocked specialists", () => {
  assert.equal(specialistLeadSessionErrorStatus({ kind: "specialist_required" }), 403);
  assert.equal(specialistLeadSessionErrorCode({ kind: "specialist_required" }), "specialist_required");
  assert.equal(specialistLeadSessionErrorStatus({ kind: "forbidden_blocked" }), 403);
  assert.equal(specialistLeadSessionErrorCode({ kind: "forbidden_blocked" }), "forbidden");
  const source = readFileSync(new URL("../../app/api/specialist/matches/[matchId]/claim/route.ts", import.meta.url), "utf8");
  assert.match(source, /resolveSpecialistLeadSession/);
  assert.match(source, /session\.specialistId/);
  assert.equal(source.includes("request.json"), false);
  assert.equal(source.includes("client_email"), false);
  assert.equal(source.includes("client_phone"), false);
  assert.match(source, /claimOwnMatch/);
});
