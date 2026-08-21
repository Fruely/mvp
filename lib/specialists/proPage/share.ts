export type ProPageShareInput = {
  url: string;
  title: string;
  text: string;
};

export type ProPageShareAction = "native" | "copy" | "none";

export function canUseNativeShare(navigatorLike: { share?: unknown } | null | undefined): boolean {
  return typeof navigatorLike?.share === "function";
}

export function resolveProPageShareAction(
  navigatorLike: { share?: unknown } | null | undefined,
): ProPageShareAction {
  return canUseNativeShare(navigatorLike) ? "native" : "copy";
}

export function buildProPageSharePayload(input: ProPageShareInput): ProPageShareInput {
  return {
    url: input.url.trim(),
    title: input.title.trim(),
    text: input.text.trim(),
  };
}
