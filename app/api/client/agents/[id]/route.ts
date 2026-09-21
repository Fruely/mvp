import { NextRequest } from "next/server";
import { previewConsentableAgent } from "@/lib/agentDelegation/consentService";
import {
  jsonError,
  jsonFail,
  jsonOk,
} from "@/lib/agentDelegation/consentHttp";
import { resolveBearerAuthUser } from "@/lib/auth/resolveBearerAuthUser";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  const auth = await resolveBearerAuthUser(request);
  if (auth.kind !== "authenticated") {
    return jsonError("unauthorized", 401);
  }

  const params = await Promise.resolve(context.params);
  const result = await previewConsentableAgent(
    createSupabaseServerClient(),
    auth.userId,
    params.id,
  );
  if (result.kind !== "ok") return jsonFail(result);
  return jsonOk(result.value);
}
