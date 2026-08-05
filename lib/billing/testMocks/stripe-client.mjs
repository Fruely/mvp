import { billingHarness } from "./promotedAccess.harness.mjs";

export function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) return null;
  return {
    checkout: {
      sessions: {
        create: async (params) => {
          billingHarness.stripeSessions.push(params);
          if (billingHarness.stripeShouldFail) {
            throw new Error("stripe_session_failed");
          }
          return {
            id: "cs_test_promoted_access",
            url: "https://checkout.stripe.com/c/pay/test-promoted-access",
          };
        },
      },
    },
    customers: {
      create: async () => ({ id: "cus_test_promoted" }),
    },
  };
}
