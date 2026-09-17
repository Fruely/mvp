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
  assert.match(publicFeedSource, /from\("service_request_promotions"\)/);
  assert.match(publicFeedSource, /public_title, public_summary/);
  assert.match(publicFeedSource, /\.eq\("status", "published"\)/);
  assert.match(publicFeedSource, /\.is\("closed_at", null\)/);
  assert.match(publicFeedSource, /localized_copy/);
  assert.match(publicFeedSource, /PROMOTION_PUBLIC_SELECT_WITHOUT_LOCALIZED_COPY|WITHOUT_LOCALIZED_COPY|without localized_copy|fallbackPromotionRows/);
  assert.doesNotMatch(publicFeedSource, /\.eq\("locale", lang\)/);
  assert.match(publicFeedSource, /category_id, category_text/);
  assert.doesNotMatch(publicFeedSource, /client_name/);
  assert.doesNotMatch(publicFeedSource, /client_email/);
  assert.doesNotMatch(publicFeedSource, /client_phone/);
  assert.doesNotMatch(publicFeedSource, /\.select\([^\n]*description/);
  assert.match(publicFeedSource, /ACTIVE_REQUEST_STATUSES/);
  assert.match(publicFeedSource, /MAX_AGE_HOURS = LIVE_DEMAND_MAX_AGE_HOURS/);
  assert.match(publicFeedSource, /LIVE_DEMAND_MAX_AGE_HOURS/);
});
