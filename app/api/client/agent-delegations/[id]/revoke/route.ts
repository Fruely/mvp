import { NextRequest } from "next/server";
import { revokeUserDelegation } from "@/lib/agentDelegation/consentService";
import {
  isInvalidJson,
  jsonError,
  jsonFail,
  jsonOk,
  readJsonBody,
} from "@/lib/agentDelegation/consentHttp";
import { resolveBearerAuthUser } from "@/lib/auth/resolveBearerAuthUser";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  const auth = await resolveBearerAuthUser(request);
  if (auth.kind !== "authenticated") {
    return jsonError("unauthorized", 401);
  }

  const params = await Promise.resolve(context.params);
  const body = await readJsonBody(request);
  if (isInvalidJson(body)) {
    return jsonError("invalid body", 400);
  }

  const result = await revokeUserDelegation(
    createSupabaseServerClient(),
    auth.userId,
    params.id,
    body,
  );
  if (result.kind !== "ok") return jsonFail(result);
  return jsonOk(result.value);
}
