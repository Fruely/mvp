import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { getDemandChannelCopy } from "./demandChannelCopy.ts";

const repoRoot = new URL("../../", import.meta.url);

function source(path: string) {
  return readFileSync(new URL(path, repoRoot), "utf8");
}

const review = source("components/dashboard/onboarding/OnboardingReviewStep.tsx");
const publishButton = source(
  "components/dashboard/onboarding/PublishWithoutSubscriptionButton.tsx",
);
const draftDashboard = source(
  "app/[lang]/specialist/(protected)/dashboard/DraftDemandChannelDashboard.tsx",
);
const onboardingPage = source(
  "app/[lang]/specialist/(protected)/dashboard/onboarding/page.tsx",
);

test("ready unpublished specialist can publish without subscription", () => {
  assert.match(review, /PublishWithoutSubscriptionButton/);
  assert.match(review, /enabled=\{publishReady\}/);
  assert.match(review, /publishWithoutSubscription/);
  assert.match(draftDashboard, /PublishWithoutSubscriptionButton/);
  assert.match(draftDashboard, /enabled=\{ready\}/);
});

test("PPL publish action calls only /api/specialist/dashboard/publish", () => {
  assert.match(publishButton, /const PUBLISH_PATH = "\/api\/specialist\/dashboard\/publish"/);
  assert.match(publishButton, /fetch\(PUBLISH_PATH, \{ method: "POST" \}\)/);
  assert.equal((publishButton.match(/fetch\(/g) ?? []).length, 1);
  assert.doesNotMatch(publishButton, /\/api\/billing/);
  assert.doesNotMatch(publishButton, /\/api\/checkout/);
});

test("no Stripe call on PPL publish path", () => {
  assert.doesNotMatch(publishButton, /stripe/i);
  assert.doesNotMatch(review, /stripe/i);
  assert.doesNotMatch(draftDashboard, /stripe/i);
});

test("successful publish redirects to dashboard", () => {
  assert.match(publishButton, /payload\.success !== true/);
  assert.match(publishButton, /router\.push\(`\/\$\{lang\}\/specialist\/dashboard`\)/);
  assert.match(publishButton, /router\.refresh\(\)/);
});

test("publish failure shows safe error and does not fake success", () => {
  assert.match(publishButton, /setError\(fields \? `\$\{errorLabel\}: \$\{fields\}` : errorLabel\)/);
  assert.match(publishButton, /if \(!response\.ok \|\| payload\.success !== true\)/);
  assert.match(publishButton, /return;/);
  const failureBlock = publishButton.indexOf("if (!response.ok || payload.success !== true)");
  const successRedirect = publishButton.indexOf("router.push");
  assert.ok(failureBlock >= 0 && successRedirect > failureBlock);
});

test("incomplete profile cannot publish from the ready flow", () => {
  assert.match(review, /\{publishReady \? \(/);
  assert.match(review, /enabled=\{publishReady\}/);
  assert.match(draftDashboard, /\{ready \? \(/);
  assert.match(draftDashboard, /enabled=\{ready\}/);
  assert.match(draftDashboard, /copy\.continueSetup/);
});

test("subscription CTA still routes to current billing flow", () => {
  assert.match(review, /demandCopy\.onboarding\.connectSubscription/);
  assert.match(review, /specialist\/dashboard\/activate/);
  assert.match(draftDashboard, /demandCopy\.onboarding\.connectSubscription/);
  assert.match(draftDashboard, /specialist\/dashboard\/activate/);
});

test("RU/UA/DE unpaid publish labels exist", () => {
  for (const lang of ["ru", "ua", "de"] as const) {
    const copy = getDemandChannelCopy(lang);
    assert.ok(copy.onboarding.publishWithoutSubscription.trim());
    assert.ok(copy.onboarding.publishingWithoutSubscription.trim());
    assert.ok(copy.onboarding.connectSubscription.trim());
    assert.ok(copy.onboarding.publishFailed.trim());
  }

  const ru = getDemandChannelCopy("ru");
  assert.equal(ru.onboarding.publishWithoutSubscription, "Опубликовать профиль без подписки");
  assert.equal(ru.onboarding.connectSubscription, "Подключить подписку");

  const ua = getDemandChannelCopy("ua");
  assert.match(ua.onboarding.publishWithoutSubscription, /без підписки/);
  assert.match(ua.onboarding.connectSubscription, /Підключити підписку/);

  const de = getDemandChannelCopy("de");
  assert.match(de.onboarding.publishWithoutSubscription, /ohne Abo/);
  assert.match(de.onboarding.connectSubscription, /Abo/);
});

test("no client-side entitlement mutation on PPL publish", () => {
  assert.doesNotMatch(publishButton, /plan_status/);
  assert.doesNotMatch(publishButton, /specialist_plan/);
  assert.doesNotMatch(publishButton, /canUnlockLeadContacts/);
  assert.doesNotMatch(publishButton, /localStorage/);
  assert.doesNotMatch(review, /plan_status/);
  assert.match(
    onboardingPage,
    /if \(isPublishedSpecialistStatus\(specialist\.status\)\) \{[\s\S]*?redirect\(`\/\$\{lang\}\/specialist\/dashboard`\)/,
  );
});
