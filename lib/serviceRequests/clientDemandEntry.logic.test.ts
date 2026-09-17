import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const entrySource = fs.readFileSync(
  path.join(root, "components/serviceRequests/ClientDemandEntry.tsx"),
  "utf8",
);
const requestPageSource = fs.readFileSync(
  path.join(root, "app/[lang]/request/page.tsx"),
  "utf8",
);
const publicFeedSource = fs.readFileSync(
  path.join(root, "app/api/public/recent-service-requests/route.ts"),
  "utf8",
);

test("ad request entry submits into the existing service request pipeline", () => {
  assert.match(entrySource, /fetch\("\/api\/service-requests"/);
  assert.match(entrySource, /source_path:\s*`\/\$\{lang\}\/request`/);
  assert.match(entrySource, /preferred_language:\s*preferredLanguage/);
  assert.match(entrySource, /work_format:\s*workFormat/);
  assert.match(entrySource, /idempotency_key:\s*idempotencyKey\.current/);
});

test("request entry is a dedicated page, not a redirect to the old full form", () => {
  assert.match(requestPageSource, /ClientDemandEntry/);
  assert.doesNotMatch(requestPageSource, /request-service/);
  assert.match(requestPageSource, /index:\s*false/);
});

test("public live demand feed never selects client contact fields or description", () => {
  const selectCall = publicFeedSource.match(/\.select\("([^"]+)"\)/)?.[1] ?? "";
  assert.ok(selectCall.includes("public_id"));
  assert.ok(selectCall.includes("category_id"));
  assert.ok(selectCall.includes("preferred_language"));
  assert.ok(!selectCall.includes("client_name"));
  assert.ok(!selectCall.includes("client_email"));
  assert.ok(!selectCall.includes("client_phone"));
  assert.ok(!selectCall.includes("description"));
  assert.match(publicFeedSource, /ACTIVE_STATUSES/);
  assert.match(publicFeedSource, /MAX_AGE_HOURS = 72/);
});
