import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/api/response";
import { publishProPage } from "@/lib/specialists/proPage/publishProPage";
import { requireProPageEditorAccess } from "@/lib/specialists/proPage/requireProPageEditorAccess";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const access = await requireProPageEditorAccess(request);
  if (!access.ok) {
    return jsonNoStore({ error: access.error }, { status: access.status });
  }

  const service = createServiceClient();
  const result = await publishProPage(service, access.specialistId);

  if (!result.ok) {
    return jsonNoStore(
      {
        error: result.error,
        ...(result.validationErrors ? { validationErrors: result.validationErrors } : {}),
      },
      { status: result.status },
    );
  }

  return jsonNoStore({
    ok: true,
    draft: result.draft,
    publishedAt: result.publishedAt,
  });
}
