import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function source(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

test("specialist public routes use current free-entry copy", () => {
  const localized = source("app/[lang]/for-specialists/page.tsx");
  const legacy = source("app/for-specialists/page.tsx");
  const view = source("app/for-specialists/ForSpecialistsView.tsx");
  const activate = source("app/[lang]/specialist/(protected)/dashboard/activate/page.tsx");

  assert.match(localized, /CURRENT_FOR_SPECIALISTS_COPY/);
  assert.match(legacy, /CURRENT_FOR_SPECIALISTS_COPY/);
  assert.match(view, /CURRENT_FOR_SPECIALISTS_COPY/);
  assert.match(activate, /getCurrentPublicPricingCopy/);
  assert.doesNotMatch(activate, /getPublicPricingCopy\(lang\)/);
});

test("registration copy never says payment is required for public visibility", () => {
  const registration = source("components/SpecialistQuickRegisterForm.tsx");
  assert.match(registration, /Регистрация бесплатна/);
  assert.match(registration, /Реєстрація безкоштовна/);
  assert.match(registration, /Registrierung ist kostenlos/);
  assert.doesNotMatch(
    registration,
    /Публичная видимость.*после активации|Публічна видимість.*після активації|Öffentliche Sichtbarkeit.*erst nach der Aktivierung/i,
  );
});

test("all pricing locales express free publication and remove the obsolete publication trial", () => {
  for (const lang of ["ru", "ua", "de"]) {
    const data = JSON.parse(source(`locales/${lang}.json`));
    const pricing = JSON.stringify(data.pricing);

    assert.match(pricing, /бесплат|безкоштов|kostenlos/i, `${lang}: missing free-entry copy`);
    assert.doesNotMatch(
      pricing,
      /7-дневн|7-денн|7-täg|7 Kalendertage nach der ersten öffentlichen Veröffentlichung|пробный период|пробний період|Testphase/i,
      `${lang}: obsolete publication trial copy remains`,
    );
  }
});

test("legal commercial layer separates free profile publication from paid contact access", () => {
  const agb = source("lib/legal/publicCommercialAmendmentsV2.ts");
  assert.match(agb, /без обязательного подключения Freuly Professional/);
  assert.match(agb, /Бесплатная публикация профиля не означает бесплатного доступа/);
  assert.match(agb, /разовой оплаты конкретной заявки/);
  assert.match(agb, /nicht an den Erwerb eines kostenpflichtigen Tarifs gebunden/);
});

test("privacy layer keeps request preview separate from client contact disclosure", () => {
  const privacy = source("lib/legal/publicLegalPostFixes.ts");
  assert.match(privacy, /ограниченном объёме данных для предварительной оценки/);
  assert.match(privacy, /получил право на обработку или разблокировал конкретную заявку/);
  assert.match(privacy, /обмеженому обсязі даних для попередньої оцінки/);
});

test("legal acceptance versions are code-canonical, not stale hosting overrides", () => {
  const specialistMeta = source("lib/legal/specialistLegalMeta.ts");
  const partnerFlags = source("lib/partners/featureFlags.ts");

  assert.match(specialistMeta, /SPECIALIST_AGB_VERSION = "1\.3"/);
  assert.match(specialistMeta, /SPECIALIST_RULES_VERSION = "2\.2"/);
  assert.doesNotMatch(specialistMeta, /process\.env\.(?:SPECIALIST_AGB_VERSION|TERMS_VERSION|SPECIALIST_RULES_VERSION)/);

  assert.match(partnerFlags, /CANONICAL_PARTNER_AGREEMENT_VERSION/);
  assert.doesNotMatch(partnerFlags, /process\.env\.PARTNER_AGREEMENT_VERSION/);
});

test("partner model does not reward free publication or one-off lead purchases", () => {
  for (const lang of ["de", "ru", "ua"]) {
    const agreement = source(`docs/legal/final-review/partnerprogramm.${lang}.md`);
    assert.match(agreement, /Professional|Growth/);
    assert.match(agreement, /nicht.*Partnervergütung|не.*партн|не.*винагород/i);
  }

  const architecture = source("docs/architecture/decisions/003-referral-program-production-architecture.md");
  assert.match(architecture, /free base profile/i);
  assert.match(architecture, /pay-per-lead/i);
  assert.match(architecture, /not commission events/i);
});

test("approval flow preserves actual legal acceptance evidence", () => {
  const admin = source("app/api/admin/specialists/update/route.ts");
  assert.match(admin, /specialist_rules_accepted_at: app\.specialist_rules_accepted_at \|\| null/);
  assert.match(admin, /specialist_rules_version: app\.specialist_rules_version \|\| null/);
  assert.match(admin, /terms_version: app\.terms_version \|\| null/);
  assert.doesNotMatch(admin, /terms_version: app\.terms_version \|\| ['"]1\.0['"]/);
});
