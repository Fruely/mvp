import { NextRequest } from "next/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import {
  issueAgentCredential,
  listAgentCredentials,
} from "@/lib/agentProvisioning/service";
import {
  CREDENTIAL_ONE_TIME_WARNING,
  isInvalidJson,
  jsonCreated,
  jsonError,
  jsonFail,
  jsonOk,
  readJsonBody,
} from "@/lib/agentProvisioning/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  const auth = requireAdminToken(request);
  if (auth) return auth;

  const params = await Promise.resolve(context.params);
  const result = await listAgentCredentials(
    createSupabaseServerClient(),
    params.id,
  );
  if (result.kind !== "ok") return jsonFail(result);
  return jsonOk(result.value);
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  const auth = requireAdminToken(request);
  if (auth) return auth;

  const params = await Promise.resolve(context.params);
  const body = await readJsonBody(request);
  if (isInvalidJson(body)) {
    return jsonError("invalid body", 400);
  }

  const result = await issueAgentCredential(
    createSupabaseServerClient(),
    params.id,
    body,
  );
  if (result.kind !== "ok") return jsonFail(result);

  return jsonCreated(result.value, { warning: CREDENTIAL_ONE_TIME_WARNING });
}
