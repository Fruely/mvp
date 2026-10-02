import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  confirmationDeadlineFrom,
  parseServiceRequestConfirmationWindowSeconds,
} from "./serviceRequestConfirmationDeadline.ts";

test("confirmation window accepts only a positive integer number of seconds", () => {
  assert.equal(parseServiceRequestConfirmationWindowSeconds({}), null);
  assert.equal(parseServiceRequestConfirmationWindowSeconds({ SERVICE_REQUEST_CONFIRMATION_WINDOW_SECONDS: "" }), null);
  assert.equal(parseServiceRequestConfirmationWindowSeconds({ SERVICE_REQUEST_CONFIRMATION_WINDOW_SECONDS: "0" }), null);
  assert.equal(parseServiceRequestConfirmationWindowSeconds({ SERVICE_REQUEST_CONFIRMATION_WINDOW_SECONDS: "-30" }), null);
  assert.equal(parseServiceRequestConfirmationWindowSeconds({ SERVICE_REQUEST_CONFIRMATION_WINDOW_SECONDS: "1.5" }), null);
  assert.equal(parseServiceRequestConfirmationWindowSeconds({ SERVICE_REQUEST_CONFIRMATION_WINDOW_SECONDS: "15m" }), null);
  assert.equal(parseServiceRequestConfirmationWindowSeconds({ SERVICE_REQUEST_CONFIRMATION_WINDOW_SECONDS: "Infinity" }), null);
  assert.equal(parseServiceRequestConfirmationWindowSeconds({ SERVICE_REQUEST_CONFIRMATION_WINDOW_SECONDS: " 900 " }), 900);
  assert.equal(parseServiceRequestConfirmationWindowSeconds({ SERVICE_REQUEST_CONFIRMATION_WINDOW_SECONDS: "1" }), 1);
});

test("deadline is an absolute timestamp from the server authorization instant", () => {
  const authorizedAt = new Date("2026-10-02T18:00:00.000Z");
  assert.equal(confirmationDeadlineFrom(authorizedAt, 900), "2026-10-02T18:15:00.000Z");
});

test("an enormous positive duration does not throw and does not yield a deadline", () => {
  const authorizedAt = new Date("2026-10-02T18:00:00.000Z");
  assert.equal(confirmationDeadlineFrom(authorizedAt, Number.MAX_SAFE_INTEGER), null);
});

test("deadline code does not default the window or cancel an authorization", () => {
  const source = readFileSync(new URL("./serviceRequestConfirmationDeadline.ts", import.meta.url), "utf8");
  const webhook = readFileSync(new URL("./processServiceRequestAuthorizationWebhook.ts", import.meta.url), "utf8");
  const confirm = readFileSync(new URL("./confirmServiceRequestConnection.ts", import.meta.url), "utf8");
  assert.equal(source.includes("CONFIRMATION_WINDOW_SECONDS\"] ??"), false);
  assert.equal(source.includes("CONFIRMATION_WINDOW_SECONDS\"] ||"), false);
  assert.equal(source.includes("paymentIntents.cancel"), false);
  assert.equal(source.includes("connection_attempts"), false);
  assert.equal(webhook.includes("paymentIntents.cancel"), false);
  assert.equal(webhook.includes('status: "expired"'), false);
  assert.equal(confirm.includes("paymentIntents.cancel"), false);
  assert.equal(confirm.includes('status: "expired"'), false);
});
