export type FlowStep =
  | "start"
  | "service"
  | "language"
  | "format"
  | "location"
  | "radius";

export type FlowLanguage = "ua" | "ru" | "de";
export type FlowFormat = "online" | "nearby" | "any";

export type FlowState = {
  service: string;
  selectedLanguage: FlowLanguage | null;
  selectedFormat: FlowFormat | null;
  location: string;
  radiusKm: number;
};

export type FlowActionLabels = {
  nextCta: string;
  submitCta: string;
};

export function isNearbyPath(
  selectedFormat: FlowFormat | null,
  step: FlowStep
): boolean {
  return (
    selectedFormat === "nearby" || step === "location" || step === "radius"
  );
}

export function getProgressMeta(
  step: FlowStep,
  selectedFormat: FlowFormat | null
): { current: number; total: number } | null {
  if (step === "start") return null;

  const total = isNearbyPath(selectedFormat, step) ? 5 : 3;
  const indexByStep: Partial<Record<FlowStep, number>> = {
    service: 1,
    language: 2,
    format: 3,
    location: 4,
    radius: 5,
  };
  const current = indexByStep[step];
  return current ? { current, total } : null;
}

export function canAdvanceFromStep(step: FlowStep, state: FlowState): boolean {
  switch (step) {
    case "service":
      return Boolean(state.service.trim());
    case "language":
      return state.selectedLanguage !== null;
    case "format":
      return state.selectedFormat !== null;
    case "location":
      return Boolean(state.location.trim());
    case "radius":
      return state.selectedFormat === "nearby" && Boolean(state.location.trim());
    default:
      return false;
  }
}

export function isSubmitStep(step: FlowStep, state: FlowState): boolean {
  if (step === "radius") return true;
  if (step !== "format") return false;
  return state.selectedFormat === "online" || state.selectedFormat === "any";
}

export function getActionLabel(
  step: FlowStep,
  state: FlowState,
  labels: FlowActionLabels
): string {
  return isSubmitStep(step, state) ? labels.submitCta : labels.nextCta;
}

export function getNextStep(
  step: FlowStep,
  state: FlowState
): FlowStep | "submit" {
  switch (step) {
    case "service":
      return "language";
    case "language":
      return "format";
    case "format":
      if (state.selectedFormat === "nearby") return "location";
      return "submit";
    case "location":
      return "radius";
    case "radius":
      return "submit";
    default:
      return step;
  }
}

export function getPreviousStep(
  step: FlowStep,
  isHomeVariant: boolean
): FlowStep {
  switch (step) {
    case "radius":
      return "location";
    case "location":
      return "format";
    case "format":
      return "language";
    case "language":
      return "service";
    case "service":
      return isHomeVariant ? "service" : "start";
    default:
      return "start";
  }
}

export function shouldShowBackButton(
  step: FlowStep,
  isHomeVariant: boolean
): boolean {
  if (step === "start") return false;
  if (isHomeVariant && step === "service") return false;
  return true;
}

export function createInitialFlowState(
  defaultLanguage: FlowLanguage | null = null,
  initialLocation = ""
): FlowState {
  return {
    service: "",
    selectedLanguage: defaultLanguage,
    selectedFormat: null,
    location: initialLocation,
    radiusKm: 30,
  };
}
