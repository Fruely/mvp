import { isValidPublishableServicePricing } from "@/lib/specialistServices/pricing";
import type { PricingType } from "@/lib/dashboard/services";

export type PublicationService = {
  is_active: boolean;
  pricing_type: PricingType | null | undefined;
  price_from: number | null | undefined;
  price_to: number | null | undefined;
  price_comment?: string | null;
  pricing_exception?: string | null;
};

export function isProfilePublished(services: PublicationService[]): boolean {
  return services.some(
    (service) => service.is_active && isValidPublishableServicePricing(service),
  );
}
