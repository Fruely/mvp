import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("free-entry positioning has one canonical public line", () => {
  const canonical = read("lib/commercial/freeEntryPositioning.ts");
  assert.match(
    canonical,
    /Регистрация и публикация профиля — бесплатно\. Платите только за доступ к заявкам: разово или по подписке от 29€\/мес\./,
  );

  const home = read("app/[lang]/HomeClient.tsx");
  const finalOverrides = read("lib/i18nCommercialFinalOverrides.ts");
  const forSpecialists = read("app/for-specialists/currentCopy.ts");
  const pricing = read("lib/pricing/currentPublicPricingCopy.ts");

  assert.match(home, /home\.variantC\.promo\.specialist\.body/);
  assert.match(finalOverrides, /SPECIALIST_FREE_ENTRY_LINE\.ru/);
  assert.match(forSpecialists, /note: SPECIALIST_FREE_ENTRY_LINE\.ru/);
  assert.match(pricing, /subtitle: SPECIALIST_FREE_ENTRY_LINE\.ru/);
});

test("public specialist pages do not reintroduce paid-profile wording", () => {
  const legacyForSpecialists = read("app/for-specialists/copy.ts");
  const legacyPricing = read("lib/pricing/publicPricingCopy.ts");
  const currentPricing = read("lib/pricing/currentPublicPricingCopy.ts");

  assert.doesNotMatch(legacyForSpecialists, /Подключение профиля стоит от 29/);
  assert.doesNotMatch(legacyPricing, /публичный профессиональный профиль после оплаты/);
  assert.doesNotMatch(legacyPricing, /Оплата тарифа активирует публичный профиль/);
  assert.match(currentPricing, /публичный профиль \(бесплатная публикация\)/);
});

test("pricing makes free publication and one-off request pricing explicit", () => {
  const compare = read("lib/i18nCommercialOverridesV2.ts");
  const pricing = read("lib/pricing/currentPublicPricingCopy.ts");
  const canonical = read("lib/commercial/freeEntryPositioning.ts");

  assert.match(compare, /Публичный профиль", professional: "Да, бесплатно", growth: "Да, бесплатно"/);
  assert.match(canonical, /ONE_OFF_REQUEST_ACCESS_FROM_EUR = 20/);
  assert.match(canonical, /Разовый доступ к заявке — от \$\{ONE_OFF_REQUEST_ACCESS_FROM_EUR\} €/);
  assert.match(pricing, /ONE_OFF_REQUEST_ACCESS_LINE\.ru/);
});

test("specialist landing keeps the five-minute free-profile proof point", () => {
  const copy = read("app/for-specialists/currentCopy.ts");
  assert.match(copy, /value: "5 минут"/);
  assert.match(copy, /Профиль бесплатный, готов за 5 минут/);
  assert.doesNotMatch(copy, /портфолио и отзывы/);
});
