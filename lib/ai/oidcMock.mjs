/** Test double. The real helper is never called from unit tests. */
export async function getVercelOidcToken() {
  throw new Error("oidc token unavailable");
}
