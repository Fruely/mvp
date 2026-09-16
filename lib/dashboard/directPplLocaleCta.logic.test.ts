import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { DEFAULT_LANG, resolveRouteLang } from "../i18n.ts";
import { directPplBuyLabel } from "./directPplBuyCopy.ts";
import { specialistDashboardHref } from "../specialists/dashboardHref.ts";

const repoRoot = new URL("../../", import.meta.url);

function source(path: string) {
  return readFileSync(new URL(path, repoRoot), "utf8");
}

const DISCOUNT_COPY = /зі знижкою|со скидкой|mit Rabatt|знижк|скидк|with discount/i;

const leadsTable = source("components/dashboard/LeadsTable.tsx");
const buyCopy = source("lib/dashboard/directPplBuyCopy.ts");
const langLayout = source("app/[lang]/layout.tsx");
const dashboardLayout = source("app/[lang]/specialist/(protected)/layout.tsx");
const leadsPage = source("app/[lang]/specialist/(protected)/dashboard/leads/page.tsx");
const publishButton = source(
  "components/dashboard/onboarding/PublishWithoutSubscriptionButton.tsx",
);
const checkoutCreator = source("lib/billing/createRequestOfferCheckout.ts");
const checkoutRoute = source("app/api/billing/request-offers/checkout/route.ts");
const promotedButton = source("components/billing/PromotedAccessCheckoutButton.tsx");
const languageBar = source("components/LanguageBar.tsx");
const header = source("components/Header.tsx");

test("RU dashboard lead CTA is Russian", () => {
  const label = directPplBuyLabel("ru", "20 €");
  assert.equal(label, "Купить заявку — 20 €");
  assert.match(label, /Купить заявку/);
  assert.doesNotMatch(label, /Купити/);
  assert.doesNotMatch(leadsTable, /Купити заявку — \$\{price\}/);
});

test("UA dashboard lead CTA is Ukrainian", () => {
  const label = directPplBuyLabel("ua", "20 €");
  assert.equal(label, "Купити заявку — 20 €");
  assert.match(label, /Купити заявку/);
});

test("DE dashboard lead CTA is German", () => {
  const label = directPplBuyLabel("de", "20 €");
  assert.equal(label, "Lead kaufen – 20 €");
  assert.match(label, /Lead kaufen/);
});

test("post-onboarding redirect preserves lang", () => {
  assert.match(publishButton, /router\.push\(`\/\$\{lang\}\/specialist\/dashboard`\)/);
  assert.doesNotMatch(publishButton, /\/ua\/specialist\/dashboard/);
  assert.doesNotMatch(publishButton, /specialistDashboardHrefClient/);
});

test("direct PPL CTA contains no discount wording", () => {
  assert.doesNotMatch(buyCopy, DISCOUNT_COPY);
  assert.doesNotMatch(leadsTable, DISCOUNT_COPY);
  for (const lang of ["ru", "ua", "de"] as const) {
    assert.doesNotMatch(directPplBuyLabel(lang, "20 €"), DISCOUNT_COPY);
  }
});

test("direct PPL CTA uses server price only", () => {
  assert.match(leadsTable, /directPplBuyLabel\(uiLang, price\)/);
  assert.match(leadsTable, /moneyLabel\(decision\.priceCents, decision\.currency/);
  assert.match(leadsTable, /decision\.priceCents/);
  assert.doesNotMatch(leadsTable, /discount/i);
  assert.doesNotMatch(leadsTable, /promo/i);
  assert.match(checkoutCreator, /unit_amount: priceCents/);
  assert.doesNotMatch(checkoutCreator, /discounts:/);
  assert.doesNotMatch(checkoutRoute, /price_cents/);
});

test("legacy promoted flow remains isolated from direct PPL CTA", () => {
  assert.match(promotedButton, /dashboard\.promotedRequestPage\.checkout\.cta/);
  assert.doesNotMatch(leadsTable, /promotedRequestPage/);
  assert.doesNotMatch(leadsTable, /PromotedAccessCheckoutButton/);
  assert.doesNotMatch(buyCopy, /promoted/i);
  assert.match(checkoutCreator, /request_kind", "direct_lead"/);
});

test("no locale fallback forces UA for RU/DE dashboard routes", () => {
  assert.equal(DEFAULT_LANG, "ru");
  assert.equal(resolveRouteLang("ru"), "ru");
  assert.equal(resolveRouteLang("de"), "de");
  assert.equal(resolveRouteLang("ua"), "ua");
  assert.equal(resolveRouteLang("RU"), "ru");
  assert.equal(resolveRouteLang("uk"), "ru");
  assert.equal(resolveRouteLang("en"), "ru");
  assert.equal(resolveRouteLang(undefined), "ru");
  assert.equal(specialistDashboardHref("ru"), "/ru/specialist/dashboard");
  assert.equal(specialistDashboardHref("de"), "/de/specialist/dashboard");
  assert.equal(specialistDashboardHref(null), "/ru/specialist/dashboard");

  assert.match(dashboardLayout, /resolveRouteLang\(resolved\.lang\)/);
  assert.match(leadsPage, /resolveRouteLang\(resolved\.lang\)/);
  assert.doesNotMatch(dashboardLayout, /: "ua"/);
  assert.doesNotMatch(leadsPage, /: "ua"/);
  assert.doesNotMatch(langLayout, /redirect\("\/ua"\)/);
  assert.doesNotMatch(langLayout, /locales\/ua\.json/);
  assert.match(langLayout, /LanguageBar serverLang=\{lang\}/);
  assert.doesNotMatch(header, /Тарифи/);
  assert.doesNotMatch(leadsTable, /specialist\.languages/);
  assert.doesNotMatch(dashboardLayout, /specialist\.languages/);
  assert.doesNotMatch(leadsPage, /specialist\.languages/);
  assert.match(languageBar, /isPrivateDashboardPath\(pathname\)/);
  assert.match(checkoutCreator, /locale: stripeCheckoutLocale\(input\.lang\)/);
  assert.match(checkoutCreator, /\$\{base\}\/\$\{input\.lang\}\/specialist\/dashboard\/leads/);
});
