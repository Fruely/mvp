import type { PricingType } from "@/lib/dashboard/services";

export type PublicationService = {
  is_active: boolean;
  pricing_type: PricingType | null | undefined;
  price_from: number | null | undefined;
  price_to: number | null | undefined;
};

function hasValidPrice(service: PublicationService): boolean {
  if (typeof service.price_from !== "number" || !Number.isFinite(service.price_from)) return false;
  if (service.price_from < 0) return false;
  if (service.pricing_type === "range") {
    if (typeof service.price_to !== "number" || !Number.isFinite(service.price_to)) return false;
    if (service.price_to < service.price_from) return false;
  }
  return true;
}

export function isProfilePublished(services: PublicationService[]): boolean {
  return services.some((service) => service.is_active && hasValidPrice(service));
}

