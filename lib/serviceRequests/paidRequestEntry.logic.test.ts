import assert from "node:assert/strict";
import test from "node:test";
import {
  PAID_REQUEST_UTM_DEFAULTS,
  buildPaidRequestPath,
  buildPaidRequestUrl,
  paidRequestPath,
} from "./paidRequestEntry.ts";

test("canonical paid request paths are /ru /ua /de /request", () => {
  assert.equal(paidRequestPath("ru"), "/ru/request");
  assert.equal(paidRequestPath("ua"), "/ua/request");
  assert.equal(paidRequestPath("de"), "/de/request");
});

test("UTM builder keeps empty values out and defaults paid_social campaign links", () => {
  assert.equal(buildPaidRequestPath("ru"), "/ru/request");
  assert.equal(
    buildPaidRequestPath("ua", PAID_REQUEST_UTM_DEFAULTS),
    "/ua/request?utm_source=meta&utm_medium=paid_social",
  );
  assert.equal(
    buildPaidRequestUrl("de", {
      utm_source: "meta",
      utm_medium: "paid_social",
      utm_campaign: "lead_form",
    }, "https://freuly.de"),
    "https://freuly.de/de/request?utm_source=meta&utm_medium=paid_social&utm_campaign=lead_form",
  );
});
