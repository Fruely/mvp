import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routeSource = readFileSync(
  new URL("../../app/api/specialists/[id]/route.ts", import.meta.url),
  "utf8"
);

test("specialist API uses only the public localization facade", () => {
  assert.match(routeSource, /from "@\/lib\/localization"/);
  assert.match(routeSource, /toContentLocale/);
  assert.match(routeSource, /resolveProfileContent/);
  assert.match(routeSource, /resolveServiceContent/);
  assert.doesNotMatch(routeSource, /profileResolver|serviceResolver|locales\.ts/);
  assert.doesNotMatch(routeSource, /specialist_profile_translations/);
  assert.doesNotMatch(routeSource, /specialist_service_translations/);
  assert.doesNotMatch(routeSource, /normalizeRouteLangToDbCode/);
});

test("specialist API preserves public response fields", () => {
  const responseFields = [
    "id",
    "slug",
    "name",
    "avatar_url",
    "category",
    "category_title_ru",
    "category_title_de",
    "category_title_ua",
    "category_id",
    "category_slug",
    "languages",
    "work_format",
    "created_at",
    "city",
    "address",
    "description",
    "video_url",
    "gallery_urls",
    "certificate_urls",
    "photo_url",
    "lat",
    "lng",
    "founder_badge",
    "plan_code",
    "plan_status",
    "rating",
    "reviews_count",
    "specialist_services",
  ];
  const serviceFields = [
    "id",
    "title",
    "price_from",
    "price_to",
    "currency",
    "price_comment",
  ];

  for (const field of responseFields) {
    assert.match(routeSource, new RegExp(`\\b${field}:`));
  }
  for (const field of serviceFields) {
    assert.match(routeSource, new RegExp(`\\b${field}:`));
  }

  assert.match(routeSource, /jsonNoStore\(\{ data: result \}\)/);
  assert.match(routeSource, /\{ error: "Missing specialist id" \}.*status: 400/s);
  assert.match(routeSource, /\{ error: "Internal server error" \}.*status: 500/s);
  assert.match(routeSource, /\{ error: "Specialist not found" \}.*status: 404/s);
});
