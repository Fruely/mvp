/**
 * Master kill switch. Strict "true" only — unset/false keeps every public surface on contain.
 * Instant rollback: remove NEXT_PUBLIC_SPECIALIST_PHOTO_COVER_ENABLED
 * (or set it to anything but "true") and keep per-surface flags false.
 */
export const SPECIALIST_PHOTO_COVER_ENV = "NEXT_PUBLIC_SPECIALIST_PHOTO_COVER_ENABLED";

export type SpecialistPhotoCoverSurface = "card" | "thumb" | "hero" | "dashboard";

/**
 * Per-surface rollout. Card is prepared; thumb/hero stay false.
 * Live cover still requires NEXT_PUBLIC_SPECIALIST_PHOTO_COVER_ENABLED=true.
 * Intended sequence: cards first, thumbs next, hero last. Dashboard never covers.
 */
export const SPECIALIST_PHOTO_COVER_SURFACES: Record<SpecialistPhotoCoverSurface, boolean> = {
  card: true,
  thumb: false,
  hero: false,
  dashboard: false,
};

export function isSpecialistPhotoCoverEnvEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env[SPECIALIST_PHOTO_COVER_ENV] === "true";
}

export function isSpecialistPhotoCoverEnabled(
  surface: SpecialistPhotoCoverSurface,
  options: {
    env?: NodeJS.ProcessEnv;
    surfaces?: Record<SpecialistPhotoCoverSurface, boolean>;
  } = {},
): boolean {
  if (surface === "dashboard") return false;
  if (!isSpecialistPhotoCoverEnvEnabled(options.env ?? process.env)) return false;
  const surfaces = options.surfaces ?? SPECIALIST_PHOTO_COVER_SURFACES;
  return surfaces[surface] === true;
}
