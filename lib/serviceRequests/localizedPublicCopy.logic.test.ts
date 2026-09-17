import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  clientMatchingLanguage,
  isLiveDemandEligible,
  mapLiveDemandCard,
  resolvePublicCardCopy,
  LIVE_DEMAND_ACTIVE_STATUSES,
  LIVE_DEMAND_MAX_AGE_HOURS,
} from "./localizedPublicCopy.ts";

const NOW = Date.parse("2026-09-17T16:00:00.000Z");
const FRESH = "2026-09-17T15:00:00.000Z";
const STALE = "2026-09-13T15:00:00.000Z";

const uaLocalized = {
  ua: { title: "Потрібен фотограф у Köln", summary: "Потрібен профіфотограф для портфоліо" },
  ru: { title: "Нужен фотограф в Köln", summary: "Нужен профи-фотограф для портфолио" },
  de: { title: "Fotograf in Köln gesucht", summary: "Professioneller Fotograf für ein Portfolio" },
};

const ruLocalized = {
  ru: { title: "Нужен риэлтор", summary: "Семье нужна квартира в Dortmund" },
  ua: { title: "Потрібен рієлтор", summary: "Сім’ї потрібна квартира в Dortmund" },
  de: { title: "Immobilienmakler gesucht", summary: "Familie sucht eine Wohnung in Dortmund" },
};

function baseCard(overrides: Record<string, unknown> = {}) {
  return {
    pageLang: "ru" as const,
    publicToken: "token-ua-photo",
    publicTitle: "Потрібен фотограф у Köln",
    publicSummary: "Потрібен профіфотограф для портфоліо",
    localizedCopy: uaLocalized,
    sourceLocale: "ua",
    preferredLanguage: "ua",
    createdAt: FRESH,
    workFormat: "offline",
    city: "Köln",
    postalCode: null,
    category: null,
    promotionStatus: "published",
    publishedAt: FRESH,
    closedAt: null,
    requestStatus: "new",
    nowMs: NOW,
    ...overrides,
  };
}

test("live demand eligibility window stays 72 hours", () => {
  assert.equal(LIVE_DEMAND_MAX_AGE_HOURS, 72);
  assert.deepEqual([...LIVE_DEMAND_ACTIVE_STATUSES], ["new", "reviewing", "searching"]);
});

test("Ukrainian request appears on RU, UA and DE with localized copy", () => {
  for (const pageLang of ["ru", "ua", "de"] as const) {
    const card = mapLiveDemandCard({ ...baseCard(), pageLang });
    assert.ok(card);
    assert.equal(card.title, uaLocalized[pageLang].title);
    assert.equal(card.preferred_language, "ua");
  }
});

test("Russian request appears on all three homepage languages", () => {
  for (const pageLang of ["ru", "ua", "de"] as const) {
    const card = mapLiveDemandCard({
      ...baseCard({
        publicToken: "token-ru-realtor",
        publicTitle: ruLocalized.ru.title,
        publicSummary: ruLocalized.ru.summary,
        localizedCopy: ruLocalized,
        sourceLocale: "ru",
        preferredLanguage: "ru",
      }),
      pageLang,
    });
    assert.ok(card);
    assert.equal(card.title, ruLocalized[pageLang].title);
    assert.equal(card.preferred_language, "ru");
  }
});

test("missing translation falls back to original public copy but still renders", () => {
  const card = mapLiveDemandCard({
    ...baseCard({
      localizedCopy: { ua: uaLocalized.ua },
    }),
    pageLang: "de",
  });
  assert.ok(card);
  assert.equal(card.title, "Потрібен фотограф у Köln");
  assert.equal(card.summary, "Потрібен профіфотограф для портфоліо");
});

test("draft, closed and requests older than 72 hours stay off the drum", () => {
  assert.equal(mapLiveDemandCard(baseCard({ promotionStatus: "draft", publishedAt: null })), null);
  assert.equal(mapLiveDemandCard(baseCard({ promotionStatus: "closed", closedAt: FRESH })), null);
  assert.equal(mapLiveDemandCard(baseCard({ requestStatus: "closed" })), null);
  assert.equal(
    isLiveDemandEligible({
      promotionStatus: "published",
      publishedAt: STALE,
      closedAt: null,
      requestStatus: "new",
      requestCreatedAt: STALE,
      nowMs: NOW,
    }),
    false,
  );
  assert.equal(mapLiveDemandCard(baseCard({ createdAt: STALE })), null);
});

test("preferred_language stays the matching language and does not gate visibility", () => {
  assert.equal(clientMatchingLanguage("ua"), "ua");
  const dePage = mapLiveDemandCard({ ...baseCard({ preferredLanguage: "ua" }), pageLang: "de" });
  assert.ok(dePage);
  assert.equal(dePage.preferred_language, "ua");
  assert.equal(
    isLiveDemandEligible({
      promotionStatus: "published",
      publishedAt: FRESH,
      closedAt: null,
      requestStatus: "searching",
      requestCreatedAt: FRESH,
      nowMs: NOW,
    }),
    true,
  );
});

test("fallback resolver prefers page locale then source locale then original fields", () => {
  assert.equal(
    resolvePublicCardCopy({
      lang: "de",
      publicTitle: "Original",
      publicSummary: "Original summary",
      localizedCopy: { de: { title: "DE title", summary: "DE summary" } },
    }).title,
    "DE title",
  );
  assert.equal(
    resolvePublicCardCopy({
      lang: "de",
      publicTitle: "Original",
      publicSummary: "Original summary",
      sourceLocale: "ua",
      localizedCopy: { ua: { title: "UA title", summary: "UA summary" } },
    }).title,
    "UA title",
  );
});

test("feed still ignores page language as a filter and matching still uses preferred_language", () => {
  const feed = fs.readFileSync(
    path.join(process.cwd(), "app/api/public/recent-service-requests/route.ts"),
    "utf8",
  );
  const drum = fs.readFileSync(
    path.join(process.cwd(), "components/home/LiveRequestDrum.tsx"),
    "utf8",
  );
  const validation = fs.readFileSync(
    path.join(process.cwd(), "lib/serviceRequests/validation.ts"),
    "utf8",
  );
  const telegram = fs.readFileSync(
    path.join(process.cwd(), "lib/serviceRequests/ownerTelegramMessage.ts"),
    "utf8",
  );
  const checkout = fs.readFileSync(
    path.join(process.cwd(), "lib/billing/createPromotedReservationCheckout.ts"),
    "utf8",
  );
  assert.match(feed, /mapLiveDemandCard/);
  assert.doesNotMatch(feed, /\.eq\("locale", lang\)/);
  assert.match(feed, /preferred_language/);
  assert.match(drum, /requestPromotionPath\(lang, item\.id\)/);
  assert.match(drum, /languageLabel\(item\.preferred_language, lang\)/);
  assert.match(validation, /preferred_language is required/);
  assert.match(telegram, /preferred_language/);
  assert.doesNotMatch(checkout, /promotion\.locale !== input\.lang/);
});
