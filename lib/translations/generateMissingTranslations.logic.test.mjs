import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/localization") {
      return {
        url: new URL("../localization/index.ts", import.meta.url).href,
        shortCircuit: true,
      };
    }
    const localizationModules = {
      "./locales": "../localization/locales.ts",
      "./profileResolver": "../localization/profileResolver.ts",
      "./serviceResolver": "../localization/serviceResolver.ts",
    };
    if (
      context.parentURL?.endsWith("/lib/localization/index.ts") &&
      localizationModules[specifier]
    ) {
      return {
        url: new URL(localizationModules[specifier], import.meta.url).href,
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});

const { generateMissingTranslations, resolveTargetLocales } = await import(
  "./generateMissingTranslations.ts"
);

function createMockClient(initialRows) {
  const rows = structuredClone(initialRows);
  const writes = [];

  class Query {
    constructor(table) {
      this.table = table;
      this.filters = [];
      this.operation = "select";
      this.payload = null;
      this.rangeBounds = null;
    }

    select() {
      return this;
    }

    eq(column, value) {
      this.filters.push({ type: "eq", column, value });
      return this;
    }

    is(column, value) {
      this.filters.push({ type: "is", column, value });
      return this;
    }

    range(from, to) {
      this.rangeBounds = [from, to];
      return this;
    }

    update(payload) {
      this.operation = "update";
      this.payload = payload;
      return this;
    }

    async upsert(payload, options) {
      const tableRows = rows[this.table] ?? (rows[this.table] = []);
      const idColumn = Object.hasOwn(payload, "specialist_id")
        ? "specialist_id"
        : "specialist_service_id";
      const existing = tableRows.find(
        (row) =>
          row[idColumn] === payload[idColumn] &&
          row.language_code === payload.language_code
      );
      if (!existing) {
        tableRows.push({ id: `new-${tableRows.length}`, ...payload });
        writes.push({ type: "insert", table: this.table, payload });
      } else if (!options?.ignoreDuplicates) {
        Object.assign(existing, payload);
        writes.push({ type: "upsert", table: this.table, payload });
      }
      return { error: null };
    }

    filteredRows() {
      let result = [...(rows[this.table] ?? [])];
      for (const filter of this.filters) {
        result = result.filter((row) =>
          filter.type === "is"
            ? row[filter.column] == null
            : row[filter.column] === filter.value
        );
      }
      if (this.rangeBounds) {
        result = result.slice(this.rangeBounds[0], this.rangeBounds[1] + 1);
      }
      return result;
    }

    async maybeSingle() {
      return { data: this.filteredRows()[0] ?? null, error: null };
    }

    then(resolve, reject) {
      if (this.operation === "update") {
        const matches = this.filteredRows();
        for (const row of matches) Object.assign(row, this.payload);
        if (matches.length) {
          writes.push({
            type: "update",
            table: this.table,
            payload: this.payload,
          });
        }
        return Promise.resolve({ data: matches, error: null }).then(
          resolve,
          reject
        );
      }
      return Promise.resolve({
        data: this.filteredRows(),
        error: null,
      }).then(resolve, reject);
    }
  }

  return {
    client: {
      from(table) {
        return new Query(table);
      },
    },
    rows,
    writes,
  };
}

function sourceRows(locale) {
  return {
    specialist_profile_translations: [
      {
        id: "profile-source",
        specialist_id: "specialist-1",
        language_code: locale,
        about_me: "Profile source",
      },
    ],
    specialist_service_translations: [
      {
        id: "service-source",
        specialist_service_id: "service-1",
        language_code: locale,
        title: "Service source",
        description: "Description source",
        price_comment: "Price source",
      },
    ],
  };
}

async function withDeepLMock(run) {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init.body);
    requests.push(body);
    return new Response(
      JSON.stringify({
        translations: [
          {
            text: `${body.source_lang}->${body.target_lang}:${body.text[0]}`,
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };
  try {
    return await run(requests);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

const providerCodes = { ru: "RU", uk: "UK", de: "DE" };
for (const [sourceLocale, targetLocale] of [
  ["ru", "uk"],
  ["ru", "de"],
  ["uk", "ru"],
  ["uk", "de"],
  ["de", "ru"],
  ["de", "uk"],
]) {
  test(`${sourceLocale} generates profile and service ${targetLocale} directly`, async () => {
    const mock = createMockClient(sourceRows(sourceLocale));
    await withDeepLMock(async (requests) => {
      const stats = await generateMissingTranslations({
        supabase: mock.client,
        deeplApiKey: "test-key",
        sourceLocale,
        targetLocales: [targetLocale],
        deeplPauseMs: 0,
      });

      assert.equal(stats.inserted_profile_rows, 1);
      assert.equal(stats.inserted_service_rows, 1);
      assert.equal(stats.translated_strings, 4);
      assert.equal(stats.failed, 0);
      assert.ok(
        requests.every(
          (request) =>
            request.source_lang === providerCodes[sourceLocale] &&
            request.target_lang === providerCodes[targetLocale]
        )
      );
    });

    const profileTarget = mock.rows.specialist_profile_translations.find(
      (row) => row.language_code === targetLocale
    );
    const serviceTarget = mock.rows.specialist_service_translations.find(
      (row) => row.language_code === targetLocale
    );
    assert.match(profileTarget.about_me, new RegExp(`^${providerCodes[sourceLocale]}->`));
    assert.match(serviceTarget.title, new RegExp(`^${providerCodes[sourceLocale]}->`));
  });
}

test("existing non-empty fields are preserved while blank fields are generated", async () => {
  const rows = sourceRows("ru");
  rows.specialist_profile_translations.push({
    id: "profile-target",
    specialist_id: "specialist-1",
    language_code: "de",
    about_me: "Existing profile",
  });
  rows.specialist_service_translations.push({
    id: "service-target",
    specialist_service_id: "service-1",
    language_code: "de",
    title: "Existing title",
    description: "   ",
    price_comment: null,
  });
  const mock = createMockClient(rows);

  await withDeepLMock(async (requests) => {
    const stats = await generateMissingTranslations({
      supabase: mock.client,
      deeplApiKey: "test-key",
      sourceLocale: "ru",
      targetLocales: ["de"],
      deeplPauseMs: 0,
    });
    assert.equal(stats.skipped_existing, 1);
    assert.equal(stats.updated_service_rows, 1);
    assert.equal(requests.length, 2);
  });

  const profile = mock.rows.specialist_profile_translations.find(
    (row) => row.id === "profile-target"
  );
  const service = mock.rows.specialist_service_translations.find(
    (row) => row.id === "service-target"
  );
  assert.equal(profile.about_me, "Existing profile");
  assert.equal(service.title, "Existing title");
  assert.match(service.description, /^RU->DE:/);
  assert.match(service.price_comment, /^RU->DE:/);
});

test("source locale is excluded and duplicate targets are deduplicated", () => {
  assert.deepEqual(resolveTargetLocales("uk", ["uk", "de", "de", "ru"]), [
    "de",
    "ru",
  ]);
});

test("unsupported source and target locales are rejected before generation", () => {
  assert.throws(
    () => resolveTargetLocales("en", ["ru"]),
    /Unsupported source locale/
  );
  assert.throws(
    () => resolveTargetLocales("ru", ["en"]),
    /Unsupported target locale/
  );
});

test("source equals target performs no DeepL calls or writes", async () => {
  const mock = createMockClient(sourceRows("de"));
  await withDeepLMock(async (requests) => {
    const stats = await generateMissingTranslations({
      supabase: mock.client,
      deeplApiKey: "test-key",
      sourceLocale: "de",
      targetLocales: ["de"],
      deeplPauseMs: 0,
    });
    assert.equal(requests.length, 0);
    assert.equal(mock.writes.length, 0);
    assert.equal(stats.translated_strings, 0);
  });
});
