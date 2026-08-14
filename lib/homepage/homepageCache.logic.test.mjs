import assert from "node:assert/strict";
import test from "node:test";
import {
  isPublicHomepagePath,
  PUBLIC_HOMEPAGE_CACHE_CONTROL,
} from "./middlewareCache.ts";
import {
  serializeHomepageInitialData,
  toHomepageRecommendedDto,
} from "./serializeHomepageInitialData.ts";

test("isPublicHomepagePath matches only localized home routes", () => {
  assert.equal(isPublicHomepagePath("/"), true);
  assert.equal(isPublicHomepagePath("/ru"), true);
  assert.equal(isPublicHomepagePath("/ua"), true);
  assert.equal(isPublicHomepagePath("/de"), true);
  assert.equal(isPublicHomepagePath("/ru/category/tutors"), false);
  assert.equal(isPublicHomepagePath("/login"), false);
  assert.equal(isPublicHomepagePath("/specialists"), false);
});

test("PUBLIC_HOMEPAGE_CACHE_CONTROL is public edge cache", () => {
  assert.match(PUBLIC_HOMEPAGE_CACHE_CONTROL, /^public,/);
  assert.match(PUBLIC_HOMEPAGE_CACHE_CONTROL, /s-maxage=300/);
});

test("toHomepageRecommendedDto trims payload to card fields", () => {
  const longAbout = "a".repeat(400);
  const rows = toHomepageRecommendedDto([
    {
      id: "1",
      slug: "one",
      name: "One",
      avatar_url: "https://example.com/a.jpg",
      city: "Berlin",
      languages: ["ru"],
      category_title: "Cat",
      category_title_ru: "Cat",
      category_title_de: "Cat",
      category_title_ua: "Cat",
      about_line: longAbout,
      rating_avg: 4.9,
      reviews_count: 12,
      founder_badge: true,
      is_featured: true,
      placement_group: "premium",
      recommendation_row: 1,
      badges: ["premium_placement"],
    },
    {
      id: "2",
      slug: "two",
      name: "Two",
      avatar_url: null,
      city: null,
      languages: [],
      category_title: null,
      category_title_ru: null,
      category_title_de: null,
      category_title_ua: null,
      about_line: null,
      rating_avg: null,
      reviews_count: 0,
    },
  ]);

  assert.equal(rows.length, 2);
  assert.equal(rows[0].about_line?.length, 160);
  assert.equal(rows[0].rating_avg, undefined);
  assert.equal(rows[0].badges, undefined);
  assert.equal(rows[0].founder_badge, true);
});

test("serializeHomepageInitialData keeps only homepage category fields", () => {
  const payload = serializeHomepageInitialData({
    categories: [
      {
        id: "p1",
        slug: "parent",
        title: "Parent",
        title_ru: "P",
        title_de: "P",
        title_ua: "P",
        parent_id: null,
        specialists_count: 2,
        is_clickable: true,
        children: [
          {
            id: "c1",
            slug: "child",
            title: "Child",
            title_ru: "C",
            title_de: "C",
            title_ua: "C",
            image_url: "https://example.com/cat.png",
            specialists_count: 2,
            is_clickable: true,
          },
        ],
      },
    ],
    popularCategories: [],
    homepageParentSlotSlugs: ["parent"],
    recommendedSpecialists: [],
    starMap: {
      total: 0,
      cities: [],
      eligibleCount: 0,
      representedCount: 0,
      missingCoordinatesCount: 0,
    },
  });

  assert.equal(payload.categories[0].children?.[0].image_url, undefined);
  assert.deepEqual(payload.homepageParentSlotSlugs, ["parent"]);
});
