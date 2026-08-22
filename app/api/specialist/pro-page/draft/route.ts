import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/api/response";
import { requireProPageEditorAccess } from "@/lib/specialists/proPage/requireProPageEditorAccess";
import { saveProPageDraft, type SaveProPageDraftInput } from "@/lib/specialists/proPage/saveProPageDraft";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const access = await requireProPageEditorAccess(request);
  if (!access.ok) {
    return jsonNoStore({ error: access.error }, { status: access.status });
  }

  let body: SaveProPageDraftInput;
  try {
    body = (await request.json()) as SaveProPageDraftInput;
  } catch {
    return jsonNoStore({ error: "invalid_json" }, { status: 400 });
  }

  const service = createServiceClient();
  const result = await saveProPageDraft(service, access.specialistId, body);

  if (!result.ok) {
    return jsonNoStore({ error: result.error }, { status: result.status });
  }

  return jsonNoStore({ ok: true, draft: result.draft });
}
