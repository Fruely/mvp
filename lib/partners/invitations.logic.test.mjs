import assert from "node:assert/strict";
import test from "node:test";
import { evaluateInvitationConsume, hashToken } from "./invitationLogic.ts";

test("hashToken is sha256 hex and not raw token", () => {
  const raw = "super-secret-token";
  const h = hashToken(raw);
  assert.equal(h.length, 64);
  assert.notEqual(h, raw);
  assert.equal(hashToken(raw), h);
});

test("evaluateInvitationConsume happy path", () => {
  const r = evaluateInvitationConsume({
    invitation: {
      used_at: null,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      email: "Partner@Example.com",
    },
    partner: { user_id: null },
    userId: "user-1",
    userEmail: "partner@example.com",
  });
  assert.equal(r.ok, true);
});

test("evaluateInvitationConsume rejects used/expired/mismatch/bound", () => {
  const base = {
    invitation: {
      used_at: null,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      email: "a@example.com",
    },
    partner: { user_id: null },
    userId: "user-1",
    userEmail: "a@example.com",
  };
  assert.equal(
    evaluateInvitationConsume({
      ...base,
      invitation: { ...base.invitation, used_at: new Date().toISOString() },
    }).ok,
    false
  );
  assert.equal(
    evaluateInvitationConsume({
      ...base,
      invitation: {
        ...base.invitation,
        expires_at: new Date(Date.now() - 1000).toISOString(),
      },
    }).ok,
    false
  );
  assert.equal(
    evaluateInvitationConsume({
      ...base,
      userEmail: "other@example.com",
    }).ok,
    false
  );
  assert.equal(
    evaluateInvitationConsume({
      ...base,
      partner: { user_id: "other-user" },
    }).ok,
    false
  );
  assert.equal(evaluateInvitationConsume({ ...base, invitation: null }).ok, false);
});
