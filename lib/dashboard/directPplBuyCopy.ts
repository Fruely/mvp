import type { Lang } from "@/lib/i18n";

const DIRECT_PPL_BUY_LABEL: Record<Lang, (priceLabel: string) => string> = {
  ru: (priceLabel) => `Купить заявку — ${priceLabel}`,
  ua: (priceLabel) => `Купити заявку — ${priceLabel}`,
  de: (priceLabel) => `Lead kaufen – ${priceLabel}`,
};

/** Ordinary direct PPL CTA. No promotional/discount wording. */
export function directPplBuyLabel(lang: Lang, priceLabel: string): string {
  return (DIRECT_PPL_BUY_LABEL[lang] ?? DIRECT_PPL_BUY_LABEL.ru)(priceLabel);
}

export function stripeCheckoutLocale(lang: Lang): "ru" | "de" | "auto" {
  if (lang === "de") return "de";
  if (lang === "ru") return "ru";
  return "auto";
}
