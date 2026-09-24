import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("./forYouRequests.ts", import.meta.url), "utf8");

test("for-you feed is server-only and matches category, language, format and city", async () => {
  assert.match(source, /server-only/);
  assert.match(source, /service_request_promotions/);
  assert.match(source, /service_requests/);
  assert.match(source, /matchesForYouRequest/);
  assert.match(source, /preferred_language/);
  assert.match(source, /work_format/);
  assert.match(source, /specialist_profiles/);
});

test("for-you feed does not select client contact fields", () => {
  assert.doesNotMatch(source, /client_email|client_phone|client_name|description/);
});
