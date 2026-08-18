import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return {
        url: new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href,
        shortCircuit: true,
      };
    }
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !specifier.endsWith(".ts") &&
      !specifier.endsWith(".mjs") &&
      !specifier.endsWith(".js") &&
      !specifier.endsWith(".cjs") &&
      !specifier.endsWith(".json")
    ) {
      return {
        url: new URL(`${specifier}.ts`, context.parentURL).href,
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});

const { listPublicCommercialPlans, isPurchasablePlanCode } = await import("./planCatalog.ts");
const { parsePaidPlanCode, parsePlanCode } = await import("./plans.ts");
const { PLAN_PAYMENT_GROSS_CENTS } = await import("./planPaymentConstants.ts");

test("public catalog exposes current basic and premium amounts only", () => {
  const items = listPublicCommercialPlans();
  assert.deepEqual(
    items.map((item) => item.plan_code),
    ["basic", "premium"],
  );
  const basic = items.find((item) => item.plan_code === "basic");
  const premium = items.find((item) => item.plan_code === "premium");
  assert.equal(basic?.amount_cents, 2900);
  assert.equal(basic?.amount_cents, PLAN_PAYMENT_GROSS_CENTS.basic);
  assert.equal(premium?.amount_cents, 5900);
  assert.equal(premium?.amount_cents, PLAN_PAYMENT_GROSS_CENTS.premium);
  assert.equal(basic?.currency, "eur");
  assert.equal(basic?.period_months, 1);
  assert.equal(basic?.public_name, "Freuly Professional");
  assert.equal(premium?.public_name, "Freuly Growth");
});

test("starter is not a purchasable catalog plan", () => {
  assert.equal(isPurchasablePlanCode("starter"), false);
  assert.equal(parsePaidPlanCode("starter"), null);
  assert.equal(parsePlanCode("starter"), "starter");
  assert.equal(
    listPublicCommercialPlans().some((item) => item.plan_code === "starter"),
    false,
  );
});

test("checkout plan parsing uses the same public catalog", () => {
  assert.equal(parsePaidPlanCode("basic"), "basic");
  assert.equal(parsePaidPlanCode("premium"), "premium");
  assert.equal(parsePaidPlanCode("BASIC"), "basic");
  assert.equal(parsePaidPlanCode("growth"), null);
  assert.equal(parsePaidPlanCode("price_basic"), null);
});
