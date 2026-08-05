/** Trusted redirect URLs for promoted access checkout — no client-provided hosts. */
export function buildPromotedAccessCheckoutUrls(input: {
  siteUrl: string;
  lang: string;
}): { successUrl: string; cancelUrl: string } {
  const base = input.siteUrl.replace(/\/+$/, "");
  const lang = input.lang.trim() || "ua";
  // Billing page exists today; dedicated requests/promoted UI arrives in Phase 4D.
  const billingPath = `/${lang}/specialist/dashboard/billing`;

  return {
    successUrl: `${base}${billingPath}?promoted_checkout=success`,
    cancelUrl: `${base}${billingPath}?promoted_checkout=cancel`,
  };
}
