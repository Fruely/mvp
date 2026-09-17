export type DrumSlotStyle = {
  y: number;
  rotateX: number;
  scale: number;
  opacity: number;
  zIndex: number;
  widthPercent: number;
};

const DRUM_ACCENTS = ["#107b80", "#6d61e0", "#f29e33"] as const;

export function circularDistance(index: number, active: number, total: number): number {
  if (total <= 0) return 0;
  let distance = index - active;
  if (distance > total / 2) distance -= total;
  if (distance < -total / 2) distance += total;
  return distance;
}

/** Vertical cylindrical drum around the horizontal axis — not an orbit or side carousel. */
export function drumSlotStyle(
  distance: number,
  options?: { reducedMotion?: boolean },
): DrumSlotStyle | null {
  if (options?.reducedMotion && distance !== 0) return null;

  const abs = Math.abs(distance);
  if (abs > 2) return null;

  if (distance === 0) {
    return { y: 0, rotateX: 0, scale: 1, opacity: 1, zIndex: 30, widthPercent: 94 };
  }
  if (distance === -1) {
    return { y: -82, rotateX: 18, scale: 0.86, opacity: 0.58, zIndex: 20, widthPercent: 80 };
  }
  if (distance === 1) {
    return { y: 82, rotateX: -18, scale: 0.82, opacity: 0.3, zIndex: 12, widthPercent: 76 };
  }
  if (distance === -2) {
    return { y: -138, rotateX: 28, scale: 0.74, opacity: 0.22, zIndex: 6, widthPercent: 70 };
  }
  return { y: 138, rotateX: -28, scale: 0.74, opacity: 0.22, zIndex: 6, widthPercent: 70 };
}

export function drumCardTransform(style: DrumSlotStyle): string {
  return `translate(-50%, calc(-50% + ${style.y}px)) rotateX(${style.rotateX}deg) scale(${style.scale})`;
}

export function drumCardAccent(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return DRUM_ACCENTS[Math.abs(hash) % DRUM_ACCENTS.length];
}
