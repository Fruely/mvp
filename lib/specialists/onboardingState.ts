export type LaunchVideoGuideState = {
  snoozedUntil?: string | null;
  watchedAt?: string | null;
  lastOpenedAt?: string | null;
};

export type SpecialistOnboardingState = {
  launchVideoGuide?: LaunchVideoGuideState;
} & Record<string, unknown>;

export type VideoGuideAction = "opened" | "watched" | "snoozed";

export const VIDEO_GUIDE_AUTO_HIDE_STATUSES = new Set([
  "published_unverified",
  "published_verified",
  "featured_verified",
  "approved",
]);

export function parseSpecialistOnboardingState(
  raw: unknown
): SpecialistOnboardingState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const candidate = raw as Record<string, unknown>;
  const launchVideoGuideRaw = candidate.launchVideoGuide;
  if (
    !launchVideoGuideRaw ||
    typeof launchVideoGuideRaw !== "object" ||
    Array.isArray(launchVideoGuideRaw)
  ) {
    return { ...candidate };
  }
  const guide = launchVideoGuideRaw as Record<string, unknown>;
  return {
    ...candidate,
    launchVideoGuide: {
      snoozedUntil:
        typeof guide.snoozedUntil === "string" ? guide.snoozedUntil : null,
      watchedAt: typeof guide.watchedAt === "string" ? guide.watchedAt : null,
      lastOpenedAt:
        typeof guide.lastOpenedAt === "string" ? guide.lastOpenedAt : null,
    },
  };
}

export function buildUpdatedLaunchVideoGuideState({
  currentState,
  action,
  now,
}: {
  currentState: SpecialistOnboardingState;
  action: VideoGuideAction;
  now: Date;
}): SpecialistOnboardingState {
  const nowIso = now.toISOString();
  const currentLaunchState = currentState.launchVideoGuide ?? {};
  const nextLaunchState: LaunchVideoGuideState = { ...currentLaunchState };

  if (action === "opened") {
    nextLaunchState.lastOpenedAt = nowIso;
  } else if (action === "watched") {
    nextLaunchState.watchedAt = nowIso;
  } else if (action === "snoozed") {
    nextLaunchState.snoozedUntil = new Date(
      now.getTime() + 24 * 60 * 60 * 1000
    ).toISOString();
  }

  return {
    ...currentState,
    launchVideoGuide: nextLaunchState,
  };
}

export function shouldShowLaunchVideoGuide({
  specialistStatus,
  onboardingState,
  now,
}: {
  specialistStatus: string | null | undefined;
  onboardingState: SpecialistOnboardingState;
  now: Date;
}): boolean {
  if (
    specialistStatus &&
    VIDEO_GUIDE_AUTO_HIDE_STATUSES.has(String(specialistStatus))
  ) {
    return false;
  }
  const snoozedUntilRaw = onboardingState.launchVideoGuide?.snoozedUntil;
  if (!snoozedUntilRaw) return true;

  const snoozedUntil = new Date(snoozedUntilRaw);
  if (Number.isNaN(snoozedUntil.getTime())) return true;
  return snoozedUntil.getTime() <= now.getTime();
}
