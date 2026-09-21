import { pathToFileURL } from "node:url";

const here = import.meta.url;

const MOCKS = {
  "@/lib/supabase/server": new URL("./testMocks/service-server.mjs", here).href,
  "@/lib/rate-limit/shared": new URL("./testMocks/rate-limit.mjs", here).href,
  "@/lib/notifications/notify": new URL("./testMocks/notify.mjs", here).href,
  "@/lib/adminApiAuth": new URL("./testMocks/adminApiAuth.mjs", here).href,
  "@/lib/serviceRequests/constants": new URL("./constants.ts", here).href,
  "@/lib/serviceRequests/publicId": new URL("./publicId.ts", here).href,
  "@/lib/serviceRequests/validation": new URL("./validation.ts", here).href,
  "@/lib/auth/resolveBearerAuthUser": new URL("./testMocks/resolveBearerAuthUser.mjs", here).href,
  "@/lib/clientCampaignLinks/service": new URL("./testMocks/clientCampaignService.mjs", here).href,
  "server-only": new URL("./testMocks/server-only.mjs", here).href,
  "next/headers": new URL("./testMocks/next-cookies.mjs", here).href,
  "next/server": new URL("../leads/testMocks/next-server.mjs", here).href,
};

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "./constants" && context.parentURL?.includes("validation.ts")) {
    return { url: new URL("./constants.ts", here).href, shortCircuit: true };
  }
  if (MOCKS[specifier]) {
    return { url: MOCKS[specifier], shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
