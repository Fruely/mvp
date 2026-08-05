import Stripe from "stripe";
import { getStripeSecretKey } from "@/lib/billing/stripeConfig";

let client: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  const key = getStripeSecretKey();
  if (!key) return null;
  if (!client) {
    client = new Stripe(key, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return client;
}
