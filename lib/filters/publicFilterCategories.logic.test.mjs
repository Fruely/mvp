import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { selectPublicFilterCategories } from "./publicFilterCategories.ts";

test("selectPublicFilterCategories returns child specializations only", () => {
  const categories = selectPublicFilterCategories([
    {
      slug: "health",
      title: "Health",
      parent_id: null,
    },
    {
      slug: "dentist",
      title: "Dentist",
      title_ru: "Стоматолог",
      parent_id: "parent-1",
    },
    {
      slug: "other",
      title: "Other",
      parent_id: "parent-1",
    },
  ]);

  assert.equal(categories.length, 1);
  assert.deepEqual(categories[0], {
    slug: "dentist",
    title: "Dentist",
    title_ru: "Стоматолог",
    title_de: null,
    title_ua: null,
  });
});

test("filters route applies child-only category selection at the server boundary", () => {
  const routeSource = readFileSync(
    new URL("../../app/api/filters/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(routeSource, /selectPublicFilterCategories/);
  assert.match(routeSource, /parent_id/);
  assert.match(routeSource, /\.not\(['"]parent_id['"], ['"]is['"], null\)/);
});
