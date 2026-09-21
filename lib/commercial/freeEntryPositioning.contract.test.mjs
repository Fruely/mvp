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
  assert.match(canonical, /Разовый доступ к конкретной заявке для зарегистрированного специалиста — от \$\{ONE_OFF_REQUEST_ACCESS_FROM_EUR\} €/);
  assert.match(pricing, /ONE_OFF_REQUEST_ACCESS_LINE\.ru/);
});

test("specialist landing keeps the five-minute free-profile proof point", () => {
  const copy = read("app/for-specialists/currentCopy.ts");
  assert.match(copy, /value: "5 минут"/);
  assert.match(copy, /Профиль бесплатный, готов за 5 минут/);
  assert.doesNotMatch(copy, /портфолио и отзывы/);
});

test("public copy explains registration and subscription economics", () => {
  const specialistCopy = read("app/for-specialists/currentCopy.ts");
  const pricingCopy = read("lib/pricing/currentPublicPricingCopy.ts");
  const pricingPage = read("app/[lang]/pricing/page.tsx");

  assert.match(specialistCopy, /Можно ли купить одну заявку без регистрации\?/);
  assert.match(specialistCopy, /Сколько заявок входит в Professional\?/);
  assert.match(pricingCopy, /Фиксированного лимита заявок нет/);
  assert.match(pricingCopy, /зарегистрированный специалист/);
  assert.match(pricingPage, /mt-3 text-base leading-relaxed text-gray-600/);
  assert.match(pricingPage, /mt-5 space-y-3 text-base leading-relaxed text-gray-700/);
});


test("paid-plan exploration never traps a draft specialist", () => {
  const pricingPage = read("app/[lang]/pricing/page.tsx");
  const activationPage = read("app/[lang]/specialist/(protected)/dashboard/activate/page.tsx");

  assert.match(pricingPage, /Ваш бесплатный профиль уже сохранён/);
  assert.match(pricingPage, /Продолжить бесплатный профиль/);
  assert.match(pricingPage, /\/specialist\/dashboard\/onboarding/);
  assert.match(activationPage, /PublishWithoutSubscriptionButton/);
  assert.match(activationPage, /Вернуться к бесплатной публикации/);
});


test("zero-results client matching is clearly free and readable", () => {
  const ru = read("locales/ru.json");
  const continuation = read("components/public/AssistedMatchingContinuation.tsx");

  assert.match(ru, /подбор через Freuly для клиента бесплатный/);
  assert.match(ru, /Оставить бесплатную заявку/);
  assert.match(ru, /Услуги выбранного специалиста оплачиваются отдельно/);
  assert.match(continuation, /sm:max-w-\[680px\]/);
  assert.match(continuation, /sm:text-lg/);
  assert.match(continuation, /sm:text-2xl/);
});
