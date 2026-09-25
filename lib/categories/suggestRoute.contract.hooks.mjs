const here = import.meta.url;

const MOCKS = {
  "@/lib/supabase/server": new URL("./testMocks/searchableCategories.mjs", here).href,
  "next/server": new URL("../leads/testMocks/next-server.mjs", here).href,
  "server-only": new URL("../serviceRequests/testMocks/server-only.mjs", here).href,
};

export async function resolve(specifier, context, nextResolve) {
  if (MOCKS[specifier]) {
    return { url: MOCKS[specifier], shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
