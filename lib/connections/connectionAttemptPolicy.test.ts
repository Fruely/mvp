import assert from "node:assert/strict";
import test from "node:test";

import {
  CONNECTION_ATTEMPT_STATUSES,
  CONNECTION_FEE_AMOUNT_CENTS,
  CONNECTION_FEE_CURRENCY,
  canTransitionConnectionAttempt,
  isConnectionAttemptStatus,
  isTerminalConnectionAttemptStatus,
  requiresAuthorizedPaymentIntent,
  requiresClientConfirmation,
  type ConnectionAttemptStatus,
} from "./connectionAttemptPolicy";

test("MP1-S4 fee is fixed at EUR 25.00", () => {
  assert.equal(CONNECTION_FEE_AMOUNT_CENTS, 2500);
  assert.equal(CONNECTION_FEE_CURRENCY, "eur");
});

test("connection attempt exposes the canonical persisted states", () => {
  assert.deepEqual(CONNECTION_ATTEMPT_STATUSES, [
    "payment_required",
    "authorizing",
    "authorized",
    "client_confirmed",
    "capturing",
    "connected",
    "declined",
    "expired",
    "failed",
  ]);

  for (const status of CONNECTION_ATTEMPT_STATUSES) {
    assert.equal(isConnectionAttemptStatus(status), true);
  }
  assert.equal(isConnectionAttemptStatus("paid"), false);
  assert.equal(isConnectionAttemptStatus("matching_ready"), false);
});

test("same-state replay is idempotently accepted", () => {
  for (const status of CONNECTION_ATTEMPT_STATUSES) {
    assert.equal(canTransitionConnectionAttempt(status, status), true);
  }
});

test("happy path cannot skip client confirmation or capture", () => {
  assert.equal(canTransitionConnectionAttempt("payment_required", "authorizing"), true);
  assert.equal(canTransitionConnectionAttempt("authorizing", "authorized"), true);
  assert.equal(canTransitionConnectionAttempt("authorized", "client_confirmed"), true);
  assert.equal(canTransitionConnectionAttempt("client_confirmed", "capturing"), true);
  assert.equal(canTransitionConnectionAttempt("capturing", "connected"), true);

  assert.equal(canTransitionConnectionAttempt("authorized", "connected"), false);
  assert.equal(canTransitionConnectionAttempt("client_confirmed", "connected"), false);
  assert.equal(canTransitionConnectionAttempt("payment_required", "connected"), false);
});

test("authorized attempt can be rejected or expired without capture", () => {
  assert.equal(canTransitionConnectionAttempt("authorized", "declined"), true);
  assert.equal(canTransitionConnectionAttempt("authorized", "expired"), true);
  assert.equal(canTransitionConnectionAttempt("authorizing", "declined"), false);
  assert.equal(canTransitionConnectionAttempt("capturing", "declined"), false);
});

test("authorizing may return to payment_required without pretending payment succeeded", () => {
  assert.equal(canTransitionConnectionAttempt("authorizing", "payment_required"), true);
});

test("terminal states do not transition to another state", () => {
  const terminal: ConnectionAttemptStatus[] = ["connected", "declined", "expired", "failed"];
  for (const from of terminal) {
    assert.equal(isTerminalConnectionAttemptStatus(from), true);
    for (const to of CONNECTION_ATTEMPT_STATUSES) {
      if (to === from) continue;
      assert.equal(canTransitionConnectionAttempt(from, to), false, `${from} -> ${to}`);
    }
  }

  assert.equal(isTerminalConnectionAttemptStatus("authorized"), false);
});

test("payment and client-confirmation facts are required only downstream", () => {
  assert.equal(requiresAuthorizedPaymentIntent("payment_required"), false);
  assert.equal(requiresAuthorizedPaymentIntent("authorizing"), false);
  assert.equal(requiresAuthorizedPaymentIntent("authorized"), true);
  assert.equal(requiresAuthorizedPaymentIntent("declined"), true);
  assert.equal(requiresAuthorizedPaymentIntent("expired"), true);
  assert.equal(requiresAuthorizedPaymentIntent("connected"), true);

  assert.equal(requiresClientConfirmation("authorized"), false);
  assert.equal(requiresClientConfirmation("client_confirmed"), true);
  assert.equal(requiresClientConfirmation("capturing"), true);
  assert.equal(requiresClientConfirmation("connected"), true);
  assert.equal(requiresClientConfirmation("declined"), false);
});
