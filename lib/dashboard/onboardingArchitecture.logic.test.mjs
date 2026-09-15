import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const repoRoot = new URL("../../", import.meta.url);

function source(path) {
  return readFileSync(new URL(path, repoRoot), "utf8");
}

test("onboarding entry and protected gate use the canonical persisted-data resolver", () => {
  const onboardingPage = source(
    "app/[lang]/specialist/(protected)/dashboard/onboarding/page.tsx",
  );
  const protectedLayout = source("app/[lang]/specialist/(protected)/layout.tsx");
  const registration = source("components/SpecialistQuickRegisterForm.tsx");

  assert.match(onboardingPage, /getFirstIncompleteOnboardingStep\(validation\)/);
  assert.match(protectedLayout, /gate\.firstIncompleteStep \?\? "basic"/);
  assert.doesNotMatch(registration, /step=welcome/);
});

test("services step exposes one explicit action for missing or valid service state", () => {
  const servicesStep = source(
    "components/dashboard/onboarding/OnboardingServicesStep.tsx",
  );
  const wizard = source(
    "components/dashboard/onboarding/SpecialistOnboardingWizard.tsx",
  );

  assert.match(servicesStep, /servicesStep\.missingMessage/);
  assert.match(servicesStep, /servicesStep\.openServices/);
  assert.match(servicesStep, /servicesStep\.validMessage/);
  assert.match(servicesStep, /servicesStep\.continueToPhoto/);
  assert.match(wizard, /summary=\{servicesSummary\}/);
});

test("valid service creation returns to the next onboarding step using canonical validity", () => {
  const servicesPage = source(
    "app/[lang]/specialist/(protected)/dashboard/services/page.tsx",
  );
  const servicesTable = source("components/dashboard/ServicesTable.tsx");

  assert.match(servicesPage, /hasValidServiceForPublish\(servicesInSelectedCategory\)/);
  assert.match(servicesPage, /initialShowCreate=\{showOnboardingReturn\}/);
  assert.match(servicesTable, /hasValidServiceForPublish\(\[service\]\)/);
  assert.match(servicesTable, /router\.push\(onboardingReturnHref\)/);
});

test("ready unpublished review publishes without subscription and keeps tariffs optional", () => {
  const review = source(
    "components/dashboard/onboarding/OnboardingReviewStep.tsx",
  );
  const publishButton = source(
    "components/dashboard/onboarding/PublishWithoutSubscriptionButton.tsx",
  );
  const publishAction = review.indexOf("PublishWithoutSubscriptionButton");
  const hardRequirements = review.indexOf(
    "dashboard.onboarding.reviewStep.hardRequirementsTitle",
  );

  assert.ok(publishAction >= 0);
  assert.ok(hardRequirements >= 0);
  assert.ok(publishAction < hardRequirements);
  assert.match(review, /enabled=\{publishReady\}/);
  assert.match(review, /demandCopy\.onboarding\.publishWithoutSubscription/);
  assert.match(review, /demandCopy\.onboarding\.connectSubscription/);
  assert.match(review, /specialist\/dashboard\/activate/);
  assert.doesNotMatch(review, /paid_plan_required/);
  assert.match(publishButton, /fetch\(PUBLISH_PATH, \{ method: "POST" \}\)/);
  assert.match(publishButton, /\/api\/specialist\/dashboard\/publish/);
  assert.doesNotMatch(publishButton, /stripe/i);
  assert.doesNotMatch(publishButton, /checkout/i);
  assert.doesNotMatch(publishButton, /entitlement/i);
  assert.match(publishButton, /payload\.success !== true/);
  assert.match(publishButton, /router\.push\(`\/\$\{lang\}\/specialist\/dashboard`\)/);
});

test("unpublished specialists can reach activate and billing routes", () => {
  const protectedLayout = source("app/[lang]/specialist/(protected)/layout.tsx");
  assert.match(protectedLayout, /dashboardBase\}\/activate/);
  assert.match(protectedLayout, /dashboardBase\}\/billing/);
});

test("published specialists cannot use onboarding as an alternate runtime path", () => {
  const onboardingPage = source(
    "app/[lang]/specialist/(protected)/dashboard/onboarding/page.tsx",
  );

  assert.match(
    onboardingPage,
    /if \(isPublishedSpecialistStatus\(specialist\.status\)\) \{[\s\S]*?redirect\(`\/\$\{lang\}\/specialist\/dashboard`\)/,
  );
});

test("canonical onboarding has no imports from obsolete or legacy runtime modules", () => {
  const onboardingDir = new URL(
    "components/dashboard/onboarding/",
    repoRoot,
  );
  const forbidden =
    /ProfileCompletion|ProfilePublicationStatus|isProfilePublished|legacy-onboarding/;

  const files = readdirSync(onboardingDir).filter((file) => file.endsWith(".tsx"));
  assert.equal(
    files.filter((file) => file === "SpecialistOnboardingWizard.tsx").length,
    1,
  );

  for (const file of files) {
    assert.doesNotMatch(source(`components/dashboard/onboarding/${file}`), forbidden);
  }
});
