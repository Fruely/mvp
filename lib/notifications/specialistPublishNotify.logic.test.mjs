import assert from "node:assert/strict";
import test from "node:test";
import {
  formatGeographyNotifyBlock,
  formatCategoryNotifyBlock,
  formatSpecialistPublishNotifyDetails,
} from "./specialistPublishNotify.ts";

const BONN = { lat: 50.7374, lng: 7.0982 };

test("Telegram geography block includes format city radius coords", () => {
  const block = formatGeographyNotifyBlock({
    workFormat: "offline",
    postalCode: "53115",
    city: "Bonn",
    countryCode: "DE",
    lat: BONN.lat,
    lng: BONN.lng,
    serviceRadiusKm: 50,
  });
  assert.match(block, /Формат: Offline/);
  assert.match(block, /53115 Bonn, DE/);
  assert.match(block, /Зона обслуживания: 50 км/);
  assert.match(block, /Координаты: имеются/);
});

test("Telegram online radius not applicable", () => {
  const block = formatGeographyNotifyBlock({
    workFormat: "online",
    postalCode: "53115",
    city: "Bonn",
    countryCode: "DE",
    lat: BONN.lat,
    lng: BONN.lng,
    serviceRadiusKm: null,
  });
  assert.match(block, /Зона обслуживания: не применяется/);
});

test("Telegram incomplete geo warning", () => {
  const block = formatGeographyNotifyBlock({
    workFormat: "offline",
    postalCode: "53115",
    city: null,
    countryCode: "DE",
    lat: BONN.lat,
    lng: BONN.lng,
    serviceRadiusKm: null,
  });
  assert.match(block, /География профиля неполная/);
});

test("Telegram details combine category + geography", () => {
  const category = formatCategoryNotifyBlock({
    categoryId: "cat-1",
    selected: {
      id: "cat-1",
      parent_id: "parent-1",
      slug: "massage",
      title: "Massage",
      title_ru: "Массаж",
      title_ua: null,
      title_de: null,
    },
    parent: {
      id: "parent-1",
      parent_id: null,
      slug: "beauty",
      title: "Beauty",
      title_ru: "Красота",
      title_ua: null,
      title_de: null,
    },
  });
  const geography = formatGeographyNotifyBlock({
    workFormat: "offline",
    postalCode: "53115",
    city: "Bonn",
    countryCode: "DE",
    lat: BONN.lat,
    lng: BONN.lng,
    serviceRadiusKm: 50,
  });
  const details = formatSpecialistPublishNotifyDetails({
    categoryBlock: category,
    geographyBlock: geography,
    slug: "sofiia",
    status: "published_unverified",
  });
  assert.match(details, /Категория/);
  assert.match(details, /Формат: Offline/);
  assert.match(details, /53115 Bonn/);
});
