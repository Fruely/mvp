import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  isExcludedFromPublicCategoryListing,
  OTHER_SPECIALIZATION_CATEGORY_SLUG,
  UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG,
} from "./uncategorizedSpecialistCategory.ts";

test("isExcludedFromPublicCategoryListing excludes other and other-specialization", () => {
  assert.equal(isExcludedFromPublicCategoryListing("other"), true);
  assert.equal(isExcludedFromPublicCategoryListing("other-specialization"), true);
  assert.equal(isExcludedFromPublicCategoryListing("psychologists"), false);
  assert.equal(isExcludedFromPublicCategoryListing(""), true);
});

test("categories route uses canonical public listing exclusion helper", () => {
  const routeSource = readFileSync(
    new URL("../../app/api/specialists/categories/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(routeSource, /isExcludedFromPublicCategoryListing/);
  assert.doesNotMatch(
    routeSource,
    /category\.slug !== UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG/,
  );
});

test("public discovery normalization drops other-specialization from parents and children", () => {
  const rows = [
    { id: "parent-health", slug: "health", parent_id: null },
    {
      id: "parent-other-spec",
      slug: OTHER_SPECIALIZATION_CATEGORY_SLUG,
      parent_id: null,
    },
    { id: "child-psych", slug: "psychologists", parent_id: "parent-health" },
    {
      id: "child-other-spec",
      slug: OTHER_SPECIALIZATION_CATEGORY_SLUG,
      parent_id: "parent-health",
    },
    {
      id: "child-other",
      slug: UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG,
      parent_id: "parent-health",
    },
  ];

  const normalized = rows.filter(
    (row) =>
      typeof row.id === "string" &&
      typeof row.slug === "string" &&
      !isExcludedFromPublicCategoryListing(row.slug),
  );

  assert.deepEqual(normalized.map((row) => row.slug), ["health", "psychologists"]);
});

test("meta.hierarchy_enabled contract in categories route is unchanged", () => {
  const routeSource = readFileSync(
    new URL("../../app/api/specialists/categories/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(routeSource, /hierarchy_enabled:\s*hasHierarchy/);
});
