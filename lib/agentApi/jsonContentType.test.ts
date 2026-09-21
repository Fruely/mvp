import assert from "node:assert/strict";
import test from "node:test";
import { isAgentJsonContentType } from "./jsonContentType.ts";

test("accepts application/json with optional utf-8 charset", () => {
  assert.equal(isAgentJsonContentType("application/json"), true);
  assert.equal(isAgentJsonContentType("application/json; charset=utf-8"), true);
  assert.equal(isAgentJsonContentType("Application/JSON; Charset=UTF-8"), true);
});

test("rejects missing or non-JSON content types", () => {
  assert.equal(isAgentJsonContentType(null), false);
  assert.equal(isAgentJsonContentType(""), false);
  assert.equal(isAgentJsonContentType("text/plain"), false);
  assert.equal(isAgentJsonContentType("application/jsonp"), false);
  assert.equal(
    isAgentJsonContentType("application/json; charset=iso-8859-1"),
    false,
  );
});
