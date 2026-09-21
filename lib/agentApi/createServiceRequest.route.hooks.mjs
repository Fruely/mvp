const here = import.meta.url;

const MOCKS = {
  "@/lib/supabase/server": new URL(
    "../serviceRequests/testMocks/service-server.mjs",
    here,
  ).href,
  "@/lib/rate-limit/shared": new URL("./testMocks/rate-limit.mjs", here).href,
  "@/lib/notifications/notify": new URL(
    "../serviceRequests/testMocks/notify.mjs",
    here,
  ).href,
  "@/lib/agentAuth/resolve": new URL("./testMocks/agent-auth-resolve.mjs", here)
    .href,
  "@/lib/agentDelegation/resolve": new URL(
    "./testMocks/agent-delegation-resolve.mjs",
    here,
  ).href,
  "@/lib/agentAuth/audit": new URL("./testMocks/agent-audit.mjs", here).href,
  "server-only": new URL("../serviceRequests/testMocks/server-only.mjs", here)
    .href,
  "next/server": new URL("../leads/testMocks/next-server.mjs", here).href,
};

export async function resolve(specifier, context, nextResolve) {
  if (MOCKS[specifier]) {
    return { url: MOCKS[specifier], shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
