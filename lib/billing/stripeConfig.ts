/** Server-only Stripe env presence checks — never log secret values. */
export function getStripeEnvPresence(): {
  secretKey: "present" | "absent";
  webhookSecret: "present" | "absent";
} {
  return {
    secretKey: process.env.STRIPE_SECRET_KEY?.trim() ? "present" : "absent",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() ? "present" : "absent",
  };
}

export function getStripeSecretKey(): string | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  return key || null;
}

export function getStripeWebhookSecret(): string | null {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  return secret || null;
}
