export const PLAN_DISPLAY_NAMES = {
  basic: "Freuly Pro",
  premium: "Freuly Pro Premium",
} as const;

export function brandPlanText(value: string): string {
  return value
    .replace(/Freuly Professional/g, PLAN_DISPLAY_NAMES.basic)
    .replace(/Freuly Growth/g, PLAN_DISPLAY_NAMES.premium)
    .replace(/\bProfessional\b/g, "Pro")
    .replace(/\bGrowth\b/g, "Pro Premium");
}

export function brandPlanTexts(values: string[]): string[] {
  return values.map(brandPlanText);
}
