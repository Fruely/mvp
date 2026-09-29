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
  return {
    rpc: async (name: string) => {
      calls.push(name);
      return { data: payload, error: null };
    },
    from() {
      throw new Error("reservation must not read or write tables from the application");
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

test("reservation maps exclusive conflicts without another specialist identity", async () => {
  for (const error of ["already_claimed", "forbidden", "not_claimable", "not_found"] as const) {
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
