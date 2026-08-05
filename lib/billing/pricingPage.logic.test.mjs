import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const pricingPage = readFileSync(
  new URL("../../app/[lang]/pricing/page.tsx", import.meta.url),
  "utf8",
);
const ruLocale = readFileSync(new URL("../../locales/ru.json", import.meta.url), "utf8");
const uaLocale = readFileSync(new URL("../../locales/ua.json", import.meta.url), "utf8");
const deLocale = readFileSync(new URL("../../locales/de.json", import.meta.url), "utf8");
const seo = readFileSync(new URL("../seo/siteMetadata.ts", import.meta.url), "utf8");

test("A: Starter card absent from pricing page", () => {
  assert.doesNotMatch(pricingPage, /pricing\.starter/);
  assert.doesNotMatch(pricingPage, /colStarter/);
});

test("B: exactly two commercial cards", () => {
  assert.match(pricingPage, /pricing\.professional/);
  assert.match(pricingPage, /pricing\.growth/);
  assert.match(pricingPage, /lg:grid-cols-2/);
});

test("C: Professional 29 EUR monthly in RU locale", () => {
  const ru = JSON.parse(ruLocale);
  assert.match(ru.pricing.professional.price, /29 €/);
  assert.match(ru.pricing.professional.price, /месяц/);
});

test("D: Growth 59 EUR monthly in RU locale", () => {
  const ru = JSON.parse(ruLocale);
  assert.match(ru.pricing.growth.price, /59 €/);
});

test("E: Professional maps to basic billing plan", () => {
  assert.match(pricingPage, /plan="basic"/);
});

test("F: Growth maps to premium billing plan", () => {
  assert.match(pricingPage, /plan="premium"/);
});

test("G: both CTAs use billing flow", () => {
  assert.match(pricingPage, /specialist\/dashboard\/billing\?plan=/);
});

test("H: Growth CTA not disabled", () => {
  assert.doesNotMatch(pricingPage, /ctaDisabled/);
  assert.doesNotMatch(pricingPage, /Скоро/);
});

test("I: Professional shows gallery limit 5", () => {
  const ru = JSON.parse(ruLocale);
  assert.ok(ru.pricing.professional.features.some((f) => /5/.test(f)));
});

test("J: Growth shows gallery limit 15", () => {
  const ru = JSON.parse(ruLocale);
  assert.ok(ru.pricing.growth.features.some((f) => /15/.test(f)));
});

test("K: trial copy mentions 7 days", () => {
  const ru = JSON.parse(ruLocale);
  assert.ok(ru.pricing.notice.points.some((p) => /7/.test(p)));
});

test("L: no founder cohort in public copy", () => {
  for (const blob of [ruLocale, uaLocale, deLocale]) {
    assert.doesNotMatch(blob, /founder cohort/i);
    assert.doesNotMatch(blob, /первые 50/i);
  }
});

test("M: no 90 days in pricing copy", () => {
  for (const file of ["ru.json", "ua.json", "de.json"]) {
    const data = JSON.parse(readFileSync(new URL(`../../locales/${file}`, import.meta.url), "utf8"));
    const blob = JSON.stringify(data.pricing);
    assert.doesNotMatch(blob, /90 дн/i);
    assert.doesNotMatch(blob, /90 Tage/i);
  }
});

test("N: comparison table has no Starter column", () => {
  const ru = JSON.parse(ruLocale);
  assert.equal(ru.pricing.compare.colProfessional, "Freuly Professional");
  assert.equal(ru.pricing.compare.colGrowth, "Freuly Growth");
  assert.doesNotMatch(pricingPage, /colStarter/);
});

test("O: FAQ contains SEO disclaimer", () => {
  const ru = JSON.parse(ruLocale);
  const seoFaq = ru.pricing.faq.find((item) => /SEO/i.test(item.q));
  assert.ok(seoFaq);
  assert.match(seoFaq.a, /не гарантир/i);
});

test("P: FAQ does not promise Google ranking", () => {
  const ru = JSON.parse(ruLocale);
  for (const item of ru.pricing.faq) {
    assert.doesNotMatch(item.a, /топ Google/i);
    assert.doesNotMatch(item.a, /гарантир.*клиент/i);
  }
});

test("Q: DE/RU/UA pricing keys complete", () => {
  for (const blob of [ruLocale, uaLocale, deLocale]) {
    const data = JSON.parse(blob);
    assert.ok(data.pricing.professional.name);
    assert.ok(data.pricing.growth.name);
    assert.ok(data.pricing.compare.rows.length >= 10);
    assert.ok(data.pricing.faq.length >= 10);
  }
});

test("R: canonical/hreflang preserved", () => {
  assert.match(pricingPage, /hreflangPricing/);
  assert.match(pricingPage, /canonical/);
  assert.match(seo, /hreflangPricing/);
});

test("S: no coming-soon text in pricing locales", () => {
  for (const file of ["ru.json", "ua.json", "de.json"]) {
    const data = JSON.parse(readFileSync(new URL(`../../locales/${file}`, import.meta.url), "utf8"));
    const blob = JSON.stringify(data.pricing);
    assert.doesNotMatch(blob, /Скоро/i);
    assert.doesNotMatch(blob, /Bald verfügbar/i);
    assert.doesNotMatch(blob, /В разработке/i);
  }
});
