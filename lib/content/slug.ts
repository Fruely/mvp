const CONTENT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidContentSlug(value: string): boolean {
  return CONTENT_SLUG_PATTERN.test(value);
}
