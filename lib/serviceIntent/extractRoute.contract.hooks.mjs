const here = import.meta.url;

const MOCKS = {
  "@/lib/ai/aiJsonClient": new URL("./testMocks/aiJsonClient.mjs", here).href,
  "@/lib/rate-limit/shared": new URL("./testMocks/rate-limit.mjs", here).href,
  "@/lib/supabase/server": new URL("./testMocks/intent-supabase.mjs", here).href,
  "@/lib/auth/resolveBearerAuthUser": new URL("./testMocks/resolveBearerAuthUser.mjs", here).href,
  "server-only": new URL("../serviceRequests/testMocks/server-only.mjs", here).href,
  "next/server": new URL("../leads/testMocks/next-server.mjs", here).href,
};

export async function resolve(specifier, context, nextResolve) {
  if (MOCKS[specifier]) {
    return { url: MOCKS[specifier], shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
