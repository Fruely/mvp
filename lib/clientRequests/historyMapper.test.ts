import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLeadHistoryPaginationOrFilter,
  buildServiceRequestHistoryPaginationOrFilter,
  compareHistoryItemsDesc,
  decodeHistoryCursor,
  encodeHistoryCursor,
  itemIsAfterCursor,
  mapLeadHistoryRow,
  mapServiceRequestHistoryRow,
  mergeHistoryItems,
  paginateHistoryItems,
} from "./historyMapper.ts";

const sameTimestamp = "2026-08-16T10:00:00.000Z";

function lead(id: string) {
  return mapLeadHistoryRow({
    id,
    created_at: sameTimestamp,
    status: "new",
    message: null,
    specialists: null,
  });
}

function serviceRequest(id: string) {
  return mapServiceRequestHistoryRow({
    public_id: id,
    created_at: sameTimestamp,
    status: "new",
    category_text: null,
    description: null,
  });
}

test("compareHistoryItemsDesc orders created_at desc, kind asc, id asc", () => {
  const items = mergeHistoryItems([
    serviceRequest("REQ-B"),
    lead("lead-b"),
    lead("lead-a"),
    serviceRequest("REQ-A"),
  ]);

  assert.deepEqual(
    items.map((item) => `${item.kind}:${item.id}`),
    ["lead:lead-a", "lead:lead-b", "service_request:REQ-A", "service_request:REQ-B"],
  );
});

test("itemIsAfterCursor handles same-timestamp cross-kind boundary", () => {
  const cursor = {
    created_at: sameTimestamp,
    kind: "lead" as const,
    id: "lead-a",
  };

  assert.equal(itemIsAfterCursor(lead("lead-a"), cursor), false);
  assert.equal(itemIsAfterCursor(lead("lead-b"), cursor), true);
  assert.equal(itemIsAfterCursor(serviceRequest("REQ-A"), cursor), true);
});

test("pagination across same-timestamp rows does not skip or duplicate", () => {
  const items = mergeHistoryItems([
    lead("lead-c"),
    lead("lead-b"),
    lead("lead-a"),
    serviceRequest("REQ-b"),
    serviceRequest("REQ-a"),
  ]);

  const page1 = paginateHistoryItems(items, 2);
  assert.equal(page1.items.length, 2);
  assert.deepEqual(
    page1.items.map((item) => `${item.kind}:${item.id}`),
    ["lead:lead-a", "lead:lead-b"],
  );
  assert.ok(page1.next_cursor);

  const cursor = decodeHistoryCursor(page1.next_cursor);
  assert.ok(cursor);

  const page2Candidates = items.filter((item) => itemIsAfterCursor(item, cursor));
  const page2 = paginateHistoryItems(page2Candidates, 2);

  assert.deepEqual(
    page2.items.map((item) => `${item.kind}:${item.id}`),
    ["lead:lead-c", "service_request:REQ-a"],
  );
  assert.ok(page2.next_cursor);

  const cursor2 = decodeHistoryCursor(page2.next_cursor);
  assert.ok(cursor2);
  const page3Candidates = items.filter((item) => itemIsAfterCursor(item, cursor2));
  const page3 = paginateHistoryItems(page3Candidates, 2);

  assert.deepEqual(page3.items.map((item) => item.id), ["REQ-b"]);
  assert.equal(page3.next_cursor, null);

  const allIds = [...page1.items, ...page2.items, ...page3.items].map(
    (item) => `${item.kind}:${item.id}`,
  );
  assert.deepEqual(allIds, items.map((item) => `${item.kind}:${item.id}`));
});

test("lead pagination filter includes same-timestamp ids after lead cursor only", () => {
  const cursor = encodeHistoryCursor({
    created_at: sameTimestamp,
    kind: "lead",
    id: "lead-a",
  });
  const parsed = decodeHistoryCursor(cursor);
  assert.ok(parsed);

  assert.equal(
    buildLeadHistoryPaginationOrFilter(parsed),
    `created_at.lt.${sameTimestamp},and(created_at.eq.${sameTimestamp},id.gt.lead-a)`,
  );
});

test("service-request pagination filter includes all rows at timestamp after lead cursor", () => {
  const cursor = {
    created_at: sameTimestamp,
    kind: "lead" as const,
    id: "lead-z",
  };

  assert.equal(
    buildServiceRequestHistoryPaginationOrFilter(cursor),
    `created_at.lt.${sameTimestamp},created_at.eq.${sameTimestamp}`,
  );
});

test("terminal page returns null next_cursor", () => {
  const page = paginateHistoryItems([lead("only")], 5);
  assert.equal(page.items.length, 1);
  assert.equal(page.next_cursor, null);
});
