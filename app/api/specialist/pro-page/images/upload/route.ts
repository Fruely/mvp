import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/api/response";
import {
  parseProPageEditorialImageSlot,
  type ProPageEditorialImageSlot,
} from "@/lib/specialists/proPage/proPageImageSlots";
import {
  removeProPageEditorialImage,
  uploadProPageEditorialImage,
} from "@/lib/specialists/proPage/proPageImageUpload";
import { requireProPageEditorAccess } from "@/lib/specialists/proPage/requireProPageEditorAccess";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const access = await requireProPageEditorAccess(request);
  if (!access.ok) {
    return jsonNoStore({ error: access.error }, { status: access.status });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const slot = parseProPageEditorialImageSlot(formData.get("slot"));

  if (!slot) {
    return jsonNoStore({ error: "invalid_slot" }, { status: 400 });
  }
  if (!file || !(file instanceof File)) {
    return jsonNoStore({ error: "invalid_file" }, { status: 400 });
  }

  const service = createServiceClient();
  const result = await uploadProPageEditorialImage(service, access.specialistId, slot, file);

  if (!result.ok) {
    return jsonNoStore({ error: result.error }, { status: result.status });
  }

  return jsonNoStore({ ok: true, url: result.url, draft: result.draft });
}

export async function DELETE(request: NextRequest) {
  const access = await requireProPageEditorAccess(request);
  if (!access.ok) {
    return jsonNoStore({ error: access.error }, { status: access.status });
  }

  let slot: ProPageEditorialImageSlot | null = null;
  try {
    const body = (await request.json()) as { slot?: unknown };
    slot = parseProPageEditorialImageSlot(body.slot);
  } catch {
    return jsonNoStore({ error: "invalid_json" }, { status: 400 });
  }

  if (!slot) {
    return jsonNoStore({ error: "invalid_slot" }, { status: 400 });
  }

  const service = createServiceClient();
  const result = await removeProPageEditorialImage(service, access.specialistId, slot);

  if (!result.ok) {
    return jsonNoStore({ error: result.error }, { status: result.status });
  }

  return jsonNoStore({ ok: true, draft: result.draft });
}
