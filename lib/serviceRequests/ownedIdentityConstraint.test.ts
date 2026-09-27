import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

type IdentityRow = {
  client_user_id: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
};

function nonempty(value: string | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** Mirrors service_requests_anonymous_identity_required. */
export function anonymousIdentityConstraintAllows(row: IdentityRow): boolean {
  if (row.client_user_id) return true;
  return nonempty(row.client_name) && (nonempty(row.client_email) || nonempty(row.client_phone));
}

test("an owned request may omit copied name and contacts", () => {
  assert.equal(
    anonymousIdentityConstraintAllows({
      client_user_id: "user-1",
      client_name: null,
      client_email: null,
      client_phone: null,
    }),
    true,
  );
});

test("an anonymous request without a name or a contact is rejected", () => {
  assert.equal(
    anonymousIdentityConstraintAllows({
      client_user_id: null,
      client_name: null,
      client_email: null,
      client_phone: null,
    }),
    false,
  );
  assert.equal(
    anonymousIdentityConstraintAllows({
      client_user_id: null,
      client_name: "Anna",
      client_email: null,
      client_phone: null,
    }),
    false,
  );
  assert.equal(
    anonymousIdentityConstraintAllows({
      client_user_id: null,
      client_name: "Anna",
      client_email: "anna@example.com",
      client_phone: null,
    }),
    true,
  );
});

test("the migration enforces the owned versus anonymous split", () => {
  const sql = readFileSync(
    new URL("../../supabase/manual_migrations/2026-09-27_service_request_owned_identity.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /ALTER COLUMN client_name DROP NOT NULL/);
  assert.match(sql, /service_requests_anonymous_identity_required/);
  assert.match(sql, /client_user_id IS NOT NULL/);
  assert.match(sql, /client_name IS NOT NULL/);
  assert.match(sql, /client_email IS NOT NULL/);
  assert.match(sql, /client_phone IS NOT NULL/);
  assert.doesNotMatch(sql, /CREATE TABLE/);
});
