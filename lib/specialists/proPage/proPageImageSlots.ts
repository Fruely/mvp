export type ProPageEditorialImageSlot = "why_me" | "final_cta";

export function parseProPageEditorialImageSlot(value: unknown): ProPageEditorialImageSlot | null {
  return value === "why_me" || value === "final_cta" ? value : null;
}

export function draftFieldForProPageImageSlot(
  slot: ProPageEditorialImageSlot,
): "why_me_image_url" | "final_cta_image_url" {
  return slot === "why_me" ? "why_me_image_url" : "final_cta_image_url";
}
