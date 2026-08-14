import { cache } from "react";
import {
  getCurrentUserAndSpecialist,
  getSpecialistOnboardingGateState,
  type SpecialistOnboardingGateState,
  type SpecialistRow,
} from "@/lib/specialists/server";
import {
  getSpecialistPlanForDashboard,
  type SpecialistPlanForUi,
} from "@/lib/specialists/subscription";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import type { RequiredOnboardingStep } from "@/lib/dashboard/onboardingStep";

export type DashboardContext = {
  user: User;
  specialist: SpecialistRow;
  plan: SpecialistPlanForUi;
  gate: {
    state: SpecialistOnboardingGateState;
    publicationReady: boolean;
    firstIncompleteStep: RequiredOnboardingStep | null;
  };
  service: ReturnType<typeof createServiceClient>;
};

/** Request-scoped dashboard shell context — auth once, then parallel gate + plan. */
export const getDashboardContext = cache(async (): Promise<DashboardContext> => {
  const { user, specialist } = await getCurrentUserAndSpecialist();
  const service = createServiceClient();
  const [gate, plan] = await Promise.all([
    getSpecialistOnboardingGateState(specialist, service),
    getSpecialistPlanForDashboard(service, specialist.id),
  ]);
  return { user, specialist, plan, gate, service };
});
