import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(
  new URL("../../app/[lang]/specialist/(protected)/dashboard/requests/matched/page.tsx", import.meta.url),
  "utf8",
);
const view = readFileSync(
  new URL("../../components/serviceRequests/MatchedRequestsView.tsx", import.meta.url),
  "utf8",
);
const sidebar = readFileSync(new URL("../../components/dashboard/Sidebar.tsx", import.meta.url), "utf8");
const forYou = readFileSync(
  new URL("../../app/[lang]/specialist/(protected)/dashboard/requests/for-you/page.tsx", import.meta.url),
  "utf8",
);

test("the matched queue requires a signed-in specialist and loads only that specialist", () => {
  assert.match(page, /getCurrentUserAndSpecialist/);
  assert.match(page, /specialistId: specialist.id/);
  assert.match(page, /status === "blocked"/);
  assert.match(sidebar, /requests\/matched/);
  assert.match(sidebar, /requests\/for-you/);
});

test("the card and the existing promotion inbox do not show client contacts", () => {
  for (const source of [view, page]) {
    assert.doesNotMatch(source, /client_email|client_phone|client_name/);
  }
  assert.match(view, /status === "empty"/);
  assert.match(view, /status === "error"/);
  assert.match(view, /max-w-3xl/);
  assert.match(forYou, /loadForYouRequests/);
});
