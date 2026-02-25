import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminToken } from "@/lib/adminApiAuth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResponse = requireAdminToken(request);
  if (authResponse) return authResponse;

  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json(
        { error: "Missing specialist id" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const body = await request.json().catch(() => null);
    const isActive = body?.is_active;
    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "is_active must be boolean" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("specialists")
      .update({ is_active: isActive })
      .eq("id", id)
      .select("id, is_active")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Failed to update specialist active flag" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { success: true, data },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[admin] active toggle failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

