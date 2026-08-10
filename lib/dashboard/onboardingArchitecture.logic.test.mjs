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

test("ready review renders Publish before long checklist and redirects after API success", () => {
  const review = source(
    "components/dashboard/onboarding/OnboardingReviewStep.tsx",
  );
  const publishButton = review.indexOf("dashboard.onboarding.reviewStep.publish");
  const hardRequirements = review.indexOf(
    "dashboard.onboarding.reviewStep.hardRequirementsTitle",
  );

  assert.ok(publishButton >= 0);
  assert.ok(hardRequirements >= 0);
  assert.ok(publishButton < hardRequirements);
  assert.match(review, /fetch\("\/api\/specialist\/dashboard\/publish"/);
  assert.match(review, /router\.push\(dashboardLink\)/);
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
