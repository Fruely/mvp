/**
 * Portable comparison of what a person asked for and what an offer says.
 * No catalog, category, publication state, or storage client.
 */

const MIN_CONTAINED_PHRASE_LENGTH = 8;

export function normalizeServiceMeaning(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^0-9a-z\u00c0-\u024f\u0400-\u04ff]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Equal normalized phrases match.
 * A shorter phrase also matches when it appears as whole words inside the longer one.
 * A very short fragment does not match a different phrase by containment.
 */
export function serviceMeaningsCompatible(requestMeaning: string, offerMeaning: string): boolean {
  const request = normalizeServiceMeaning(requestMeaning);
  const offer = normalizeServiceMeaning(offerMeaning);
  if (!request || !offer) return false;
  if (request === offer) return true;
  const shorter = request.length <= offer.length ? request : offer;
  const longer = shorter === request ? offer : request;
  if (shorter.length < MIN_CONTAINED_PHRASE_LENGTH) return false;
  return ` ${longer} `.includes(` ${shorter} `);
}
