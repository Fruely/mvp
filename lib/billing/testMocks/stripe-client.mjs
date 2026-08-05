import { billingHarness } from "./promotedAccess.harness.mjs";
import {
  webhookHarness,
  CHARGE_ID,
  PI_ID,
} from "./promotedAccessWebhook.harness.mjs";

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
    paymentIntents: {
      retrieve: async (id) => {
        if (webhookHarness.stripeRetrieveShouldFail) {
          throw new Error("stripe_pi_retrieve_failed");
        }
        const stored = webhookHarness.paymentIntentById.get(id);
        if (stored) return stored;
        return {
          id,
          latest_charge: CHARGE_ID,
          metadata: {
            purpose: "promoted_request_access",
            payment_id: "pay-test-0001",
          },
        };
      },
    },
    webhooks: {
      constructEvent: (rawBody, signature, secret) => {
        if (signature === "invalid") {
          throw new Error("invalid_signature");
        }
        return JSON.parse(rawBody);
      },
    },
  };
}
