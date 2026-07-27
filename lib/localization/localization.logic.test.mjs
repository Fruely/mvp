import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  toContentLocale,
  toProviderLocale,
  toRouteLocale,
} from "./locales.ts";
import { resolveProfileContent } from "./profileResolver.ts";
import { resolveServiceContent } from "./serviceResolver.ts";

function createMockClient(tableRows) {
  const calls = [];

  class MockQuery {
    constructor(table) {
      this.table = table;
      this.filters = [];
    }

    select() {
      return this;
    }

    in(column, values) {
      this.filters.push({ type: "in", column, values: [...values] });
      return this;
    }

    eq(column, value) {
      this.filters.push({ type: "eq", column, value });
      return this;
    }

    then(resolve, reject) {
      calls.push({ table: this.table, filters: this.filters });
      let rows = [...(tableRows[this.table] ?? [])];
      for (const filter of this.filters) {
        if (filter.type === "in") {
          rows = rows.filter((row) => filter.values.includes(row[filter.column]));
        } else {
          rows = rows.filter((row) => row[filter.column] === filter.value);
        }
      }
      return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
    }
  }

  return {
    client: {
      from(table) {
        return new MockQuery(table);
      },
    },
    calls,
  };
}

test("locale registry normalizes route, content, and provider codes", () => {
  assert.equal(toContentLocale("ua"), "uk");
  assert.equal(toContentLocale("uk"), "uk");
  assert.equal(toContentLocale("ru"), "ru");
  assert.equal(toContentLocale("de"), "de");
  assert.equal(toContentLocale(" UA "), "uk");
  assert.equal(toContentLocale("en"), null);
  assert.equal(toContentLocale(""), null);
  assert.equal(toContentLocale(null), null);
  assert.equal(toRouteLocale("uk"), "ua");
  assert.equal(toProviderLocale("uk", "deepl"), "UK");
});

test("profile resolver prefers translation and falls back to legacy", async () => {
  const { client } = createMockClient({
    specialist_profiles: [
      { specialist_id: "a", about_me: "Legacy A" },
      { specialist_id: "b", about_me: "Legacy B" },
      { specialist_id: "c", about_me: "Legacy C" },
    ],
    specialist_profile_translations: [
      { specialist_id: "a", language_code: "uk", about_me: " Переклад A " },
      { specialist_id: "b", language_code: "uk", about_me: "   " },
    ],
  });

  const result = await resolveProfileContent(client, {
    specialistIds: ["a", "b", "c"],
    locale: "uk",
  });

  assert.deepEqual(result.get("a"), {
    specialistId: "a",
    aboutMe: "Переклад A",
    resolvedFrom: "translation",
  });
  assert.deepEqual(result.get("b"), {
    specialistId: "b",
    aboutMe: "Legacy B",
    resolvedFrom: "legacy",
  });
  assert.deepEqual(result.get("c"), {
    specialistId: "c",
    aboutMe: "Legacy C",
    resolvedFrom: "legacy",
  });
});

test("profile resolver safely returns null for missing profile", async () => {
  const { client } = createMockClient({
    specialist_profiles: [],
    specialist_profile_translations: [
      { specialist_id: "missing", language_code: "de", about_me: "Übersetzung" },
    ],
  });

  const result = await resolveProfileContent(client, {
    specialistIds: ["missing"],
    locale: "de",
  });

  assert.equal(result.get("missing"), null);
});

test("profile resolver is batch-first, order-independent, and deduplicates ids", async () => {
  const rows = {
    specialist_profiles: [
      { specialist_id: "a", about_me: "A" },
      { specialist_id: "b", about_me: "B" },
    ],
    specialist_profile_translations: [],
  };
  const firstMock = createMockClient(rows);
  const secondMock = createMockClient(rows);

  const first = await resolveProfileContent(firstMock.client, {
    specialistIds: ["a", "b", "a"],
    locale: "ru",
  });
  const second = await resolveProfileContent(secondMock.client, {
    specialistIds: ["b", "a"],
    locale: "ru",
  });

  assert.equal(firstMock.calls.length, 2);
  assert.deepEqual(
    firstMock.calls.map((call) => call.table).sort(),
    ["specialist_profile_translations", "specialist_profiles"]
  );
  for (const call of firstMock.calls) {
    const idFilter = call.filters.find((filter) => filter.type === "in");
    assert.deepEqual(idFilter.values.sort(), ["a", "b"]);
  }
  assert.equal(first.size, 2);
  assert.deepEqual(Object.fromEntries(first), Object.fromEntries(second));
});

test("service resolver resolves every field independently", async () => {
  const { client } = createMockClient({
    specialist_services: [
      {
        id: "service-1",
        title: "Legacy title",
        description: "Legacy description",
        price_comment: "Legacy price",
      },
    ],
    specialist_service_translations: [
      {
        specialist_service_id: "service-1",
        language_code: "de",
        title: " Übersetzter Titel ",
        description: "   ",
        price_comment: "Übersetzter Preis",
      },
    ],
  });

  const result = await resolveServiceContent(client, {
    serviceIds: ["service-1"],
    locale: "de",
  });

  assert.deepEqual(result.get("service-1"), {
    serviceId: "service-1",
    title: "Übersetzter Titel",
    description: "Legacy description",
    priceComment: "Übersetzter Preis",
    resolvedFrom: {
      title: "translation",
      description: "legacy",
      priceComment: "translation",
    },
  });
});

test("service resolver batches queries and handles duplicates and missing services", async () => {
  const { client, calls } = createMockClient({
    specialist_services: [
      {
        id: "service-1",
        title: "Title",
        description: null,
        price_comment: null,
      },
    ],
    specialist_service_translations: [],
  });

  const result = await resolveServiceContent(client, {
    serviceIds: ["missing", "service-1", "service-1"],
    locale: "ru",
  });

  assert.equal(calls.length, 2);
  assert.equal(result.size, 2);
  assert.equal(result.get("missing"), null);
  assert.deepEqual(result.get("service-1"), {
    serviceId: "service-1",
    title: "Title",
    description: null,
    priceComment: null,
    resolvedFrom: {
      title: "legacy",
      description: "none",
      priceComment: "none",
    },
  });
});

test("public index exports only the canonical localization surface", () => {
  const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
  assert.match(source, /toContentLocale/);
  assert.match(source, /resolveProfileContent/);
  assert.match(source, /resolveServiceContent/);
  assert.doesNotMatch(source, /specialist_profile_translations/);
  assert.doesNotMatch(source, /specialist_service_translations/);
});
