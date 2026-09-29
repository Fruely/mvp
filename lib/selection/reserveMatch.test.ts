import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { claimOwnMatch } from "./claimMatch.ts";
import { isServiceRequestPaidClaimEnabled, reserveOwnMatch } from "./reserveMatch.ts";

const MATCH_A = "11111111-1111-4111-8111-111111111111";
const MATCH_B = "22222222-2222-4222-8222-222222222222";
const SPEC_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SPEC_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CLAIM = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const ON = { SERVICE_REQUEST_PAID_CLAIM_ENABLED: "true" };

function rpcClient(payload: unknown, calls: string[]) {
  const writes: string[] = [];
  return {
    writes,
    rpc: async (name: string) => {
      calls.push(name);
      return { data: payload, error: null };
    },
    from() {
      const api = {
        select() {
          return api;
        },
        eq() {
          return api;
        },
        insert() {
          writes.push("insert");
          return api;
        },
        update() {
          writes.push("update");
          return api;
        },
        upsert() {
          writes.push("upsert");
          return api;
        },
        maybeSingle: async () => ({ data: null, error: null }),
      };
      return api;
    },
  };
}

test("paid claim flag defaults off", () => {
  assert.equal(isServiceRequestPaidClaimEnabled({}), false);
  assert.equal(isServiceRequestPaidClaimEnabled({ SERVICE_REQUEST_PAID_CLAIM_ENABLED: "false" }), false);
  assert.equal(isServiceRequestPaidClaimEnabled(ON), true);
});

test("reservation is closed when the flag is off and does not call the database", async () => {
  const calls: string[] = [];
  const result = await reserveOwnMatch(rpcClient({ ok: true, claim_id: CLAIM, changed: true }, calls), {
    matchId: MATCH_A,
    specialistId: SPEC_A,
  }, {});
  assert.deepEqual(result, { ok: false, error: "not_found" });
  assert.deepEqual(calls, []);
});

test("reservation maps the atomic rpc result and does not touch selection tables", async () => {
  const calls: string[] = [];
  const created = await reserveOwnMatch(
    rpcClient({ ok: true, claim_id: CLAIM, changed: true }, calls),
    { matchId: MATCH_A, specialistId: SPEC_A },
    ON,
  );
  const retry = await reserveOwnMatch(
    rpcClient({ ok: true, claim_id: CLAIM, changed: false }, calls),
    { matchId: MATCH_A, specialistId: SPEC_A },
    ON,
  );
  assert.deepEqual(created, { ok: true, claimId: CLAIM, changed: true });
  assert.deepEqual(retry, { ok: true, claimId: CLAIM, changed: false });
  assert.deepEqual(calls, ["reserve_service_request_claim", "reserve_service_request_claim"]);
});

test("reservation does not write selection, payment, or conversation tables", async () => {
  const client = rpcClient({ ok: true, claim_id: CLAIM, changed: true }, []);
  await reserveOwnMatch(client, { matchId: MATCH_A, specialistId: SPEC_A }, ON);
  assert.deepEqual(client.writes, []);
});

test("reservation maps exclusive conflicts without another specialist identity", async () => {
  for (const error of ["already_claimed", "forbidden", "not_claimable", "not_found", "offer_unavailable"] as const) {
    const result = await reserveOwnMatch(
      rpcClient({ ok: false, error, specialist_id: SPEC_B }, []),
      { matchId: MATCH_B, specialistId: SPEC_A },
      ON,
    );
    assert.deepEqual(result, { ok: false, error });
    assert.equal(JSON.stringify(result).includes(SPEC_B), false);
  }
});

test("reservation route uses the session specialist and does not finalize", () => {
  const source = readFileSync(
    new URL("../../app/api/specialist/matches/[matchId]/reserve/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /resolveSpecialistLeadSession/);
  assert.match(source, /session\.specialistId/);
  assert.match(source, /reserveOwnMatch/);
  assert.equal(source.includes("request.json"), false);
  assert.equal(source.includes("conversationId"), false);
  assert.equal(source.includes("claimOwnMatch"), false);
  assert.equal(source.includes("finalizeServiceRequestConnection"), false);
  assert.equal(source.includes("selected_specialist_id"), false);
  assert.equal(source.includes("client_email"), false);
});

test("legacy claim route still returns conversationId and ignores the paid flag", () => {
  const route = readFileSync(
    new URL("../../app/api/specialist/matches/[matchId]/claim/route.ts", import.meta.url),
    "utf8",
  );
  const claim = readFileSync(new URL("./claimMatch.ts", import.meta.url), "utf8");
  assert.match(route, /conversationId: result\.conversationId/);
  assert.match(route, /claimOwnMatch/);
  assert.equal(route.includes("SERVICE_REQUEST_PAID_CLAIM_ENABLED"), false);
  assert.equal(route.includes("reserveOwnMatch"), false);
  assert.match(claim, /export async function finalizeServiceRequestConnection/);
  assert.match(claim, /return finalizeServiceRequestConnection/);
  assert.equal(claim.includes("service_request_claims"), false);
  assert.equal(claim.includes("reserve_service_request_claim"), false);
  assert.equal(typeof claimOwnMatch, "function");
});

test("migration enforces one owning claim and a service-role reservation function", () => {
  const sql = readFileSync(
    new URL("../../supabase/manual_migrations/2026-09-29_service_request_claims.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.service_request_claims/);
  assert.match(sql, /status IN \('reserved', 'completed', 'released', 'expired', 'failed'\)/);
  assert.match(
    sql,
    /CREATE UNIQUE INDEX IF NOT EXISTS service_request_claims_one_owner[\s\S]*\(service_request_id\)[\s\S]*WHERE status IN \('reserved', 'completed'\)/,
  );
  assert.match(
    sql,
    /CREATE UNIQUE INDEX IF NOT EXISTS service_request_claims_one_live_match[\s\S]*\(match_id\)[\s\S]*WHERE status IN \('reserved', 'completed'\)/,
  );
  assert.match(sql, /FOR UPDATE/);
  assert.match(sql, /REVOKE ALL ON public\.service_request_claims FROM anon, authenticated/);
  assert.match(sql, /GRANT ALL ON public\.service_request_claims TO service_role/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.reserve_service_request_claim\(uuid, uuid\) FROM anon, authenticated/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.reserve_service_request_claim\(uuid, uuid\) TO service_role/);
  assert.equal(sql.includes("stripe"), false);
  assert.equal(sql.includes("client_email"), false);
  assert.equal(sql.includes("selected_specialist_id ="), false);
  assert.equal(sql.includes("INSERT INTO public.conversations"), false);
});

const REQUEST = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const OFFER = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const OTHER_OFFER = "ffffffff-ffff-4fff-8fff-ffffffffffff";

function offerRow(id: string, specialistId: string, requestId = REQUEST) {
  return {
    id,
    status: "offered",
    request_kind: "service_request",
    service_request_id: requestId,
    specialist_id: specialistId,
    offer_reason: "matched",
    billing_model: "pay_per_lead",
    idempotency_key: `service-request:${requestId}:specialist:${specialistId}:matched:initial`,
  };
}

function boundClient(
  rows: Record<string, Record<string, unknown>[]>,
  payload: unknown,
  calls: Array<{ name: string; args: Record<string, unknown> }>,
) {
  return {
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return { data: payload, error: null };
    },
    from(table: string) {
      const filters: Array<[string, unknown]> = [];
      const api = {
        select() {
          return api;
        },
        eq(column: string, value: unknown) {
          filters.push([column, value]);
          return api;
        },
        maybeSingle: async () => {
          const found = (rows[table] ?? []).filter((row) =>
            filters.every(([column, value]) => row[column] === value),
          );
          return { data: found[0] ?? null, error: null };
        },
      };
      return api;
    },
  };
}

test("paid reservation passes the server-selected offer and ignores a caller offer id", async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const result = await reserveOwnMatch(
    boundClient(
      {
        service_request_matches: [
          { id: MATCH_A, service_request_id: REQUEST, specialist_id: SPEC_A },
        ],
        request_offers: [offerRow(OFFER, SPEC_A), offerRow(OTHER_OFFER, SPEC_B)],
      },
      { ok: true, claim_id: CLAIM, changed: true },
      calls,
    ),
    { matchId: MATCH_A, specialistId: SPEC_A, requestOfferId: OTHER_OFFER } as {
      matchId: string;
      specialistId: string;
    },
    ON,
  );
  assert.deepEqual(result, { ok: true, claimId: CLAIM, changed: true });
  assert.equal(calls[0]?.args.p_request_offer_id, OFFER);
  assert.equal(JSON.stringify(calls).includes(OTHER_OFFER), false);
});

test("missing or foreign offer is not reserved", async () => {
  const missingCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const missing = await reserveOwnMatch(
    boundClient(
      {
        service_request_matches: [
          { id: MATCH_A, service_request_id: REQUEST, specialist_id: SPEC_A },
        ],
        request_offers: [],
      },
      { ok: false, error: "offer_unavailable" },
      missingCalls,
    ),
    { matchId: MATCH_A, specialistId: SPEC_A },
    ON,
  );
  assert.deepEqual(missing, { ok: false, error: "offer_unavailable" });
  assert.equal(missingCalls[0]?.args.p_request_offer_id, null);

  const foreignCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const foreign = await reserveOwnMatch(
    boundClient(
      {
        service_request_matches: [
          { id: MATCH_A, service_request_id: REQUEST, specialist_id: SPEC_A },
        ],
        request_offers: [offerRow(OTHER_OFFER, SPEC_B)],
      },
      { ok: false, error: "offer_unavailable", specialist_id: SPEC_B },
      foreignCalls,
    ),
    { matchId: MATCH_A, specialistId: SPEC_A },
    ON,
  );
  assert.deepEqual(foreign, { ok: false, error: "offer_unavailable" });
  assert.equal(foreignCalls[0]?.args.p_request_offer_id, null);
  assert.equal(JSON.stringify(foreign).includes(SPEC_B), false);
});

test("payment authorization migration keeps one reservation writer and extends payments", () => {
  const sql = readFileSync(
    new URL("../../supabase/manual_migrations/2026-09-29_service_request_payment_authorization.sql", import.meta.url),
    "utf8",
  );
  const phase1 = readFileSync(
    new URL("../../supabase/manual_migrations/2026-09-29_service_request_claims.sql", import.meta.url),
    "utf8",
  );
  assert.match(phase1, /reserve_service_request_claim\(\s*p_match_id uuid,\s*p_specialist_id uuid\s*\)/);
  assert.match(sql, /DROP FUNCTION IF EXISTS public\.reserve_service_request_claim\(uuid, uuid\)/);
  assert.match(sql, /p_request_offer_id uuid/);
  assert.match(sql, /'offer_unavailable'/);
  assert.match(sql, /request_offer_id/);
  assert.match(sql, /service_request_claim_id uuid NULL/);
  assert.match(sql, /authorized_at timestamptz NULL/);
  assert.match(sql, /released_at timestamptz NULL/);
  assert.match(sql, /'authorized'/);
  assert.match(sql, /'released'/);
  assert.match(sql, /uq_request_offer_payments_one_active_claim/);
  assert.match(sql, /status IN \('pending', 'authorized', 'paid'\)/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.reserve_service_request_claim\(uuid, uuid, uuid\) TO service_role/);
  assert.equal(sql.includes("INSERT INTO public.conversations"), false);
  assert.equal(sql.includes("selected_specialist_id ="), false);
  assert.equal(sql.includes("client_email"), false);
  const binding = sql.match(
    /p_request_offer_id IS NULL[\s\S]*?request_offer_id IS DISTINCT FROM p_request_offer_id/g,
  );
  assert.equal(binding?.length, 2);
});

test("client confirmation migration requires an authenticated client and keeps service-role execution", () => {
  const sql = readFileSync(
    new URL("../../supabase/manual_migrations/2026-09-29_service_request_client_confirmation.sql", import.meta.url),
    "utf8",
  );
  const applied = readFileSync(
    new URL("../../supabase/manual_migrations/2026-09-29_service_request_payment_authorization.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /client_confirmed_at timestamptz NULL/);
  assert.match(sql, /IF v_client_user_id IS NULL THEN/);
  assert.match(sql, /'not_claimable'/);
  assert.match(sql, /p_request_offer_id IS NULL/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.reserve_service_request_claim\(uuid, uuid, uuid\) TO service_role/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.reserve_service_request_claim\(uuid, uuid, uuid\) FROM anon, authenticated/);
  assert.equal(sql.includes("INSERT INTO public.conversations"), false);
  assert.equal(applied.includes("client_confirmed_at"), false);
  const binding = sql.match(
    /p_request_offer_id IS NULL[\s\S]*?request_offer_id IS DISTINCT FROM p_request_offer_id/g,
  );
  assert.equal(binding?.length, 2);
});
