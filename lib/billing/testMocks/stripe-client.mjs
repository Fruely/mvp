import { billingHarness, defaultStripePrice } from "./promotedAccess.harness.mjs";
import {
  webhookHarness,
  CHARGE_ID,
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
            id: params.mode === "subscription" ? "cs_test_subscription_checkout" : "cs_test_plan_payment",
            url: "https://checkout.stripe.com/c/pay/test-plan-payment",
          };
        },
        expire: async (sessionId) => {
          billingHarness.stripeExpiredSessionIds.push(sessionId);
          if (billingHarness.stripeExpireShouldFail) {
            throw new Error("stripe_session_expire_failed");
          }
          return { id: sessionId, status: "expired" };
        },
      },
    },
    coupons: {
      create: async (params) => {
        billingHarness.stripeCoupons.push(params);
        if (billingHarness.couponShouldFail) {
          throw new Error("stripe_coupon_failed");
        }
        return { id: `coupon_test_${billingHarness.stripeCoupons.length}` };
      },
    },
    customers: {
      create: async () => {
        if (billingHarness.customerShouldFail) {
          throw new Error("stripe_customer_failed");
        }
        return { id: "cus_test_plan_payment" };
      },
    },
    prices: {
      retrieve: async (priceId) => {
        if (billingHarness.stripePriceOverrides[priceId]) {
          return billingHarness.stripePriceOverrides[priceId];
        }
        return defaultStripePrice(priceId);
      },
    },
    subscriptions: {
      retrieve: async (id) => {
        if (webhookHarness.stripeSubscriptionRetrieveShouldFail) {
          throw new Error("stripe_subscription_retrieve_failed");
        }
        const stored = webhookHarness.subscriptionById.get(id);
        if (stored) return stored;
        throw new Error("subscription_not_found");
      },
      list: async () => ({ data: [] }),
    },
    invoices: {
      list: async () => ({ data: [] }),
    },
    charges: {
      retrieve: async () => ({
        balance_transaction: { fee: 30 },
      }),
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
      constructEvent: (rawBody, signature) => {
        if (signature === "invalid") {
          throw new Error("invalid_signature");
        }
        return JSON.parse(rawBody);
      },
    },
  };
}
