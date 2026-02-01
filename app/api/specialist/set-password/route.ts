import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = createSupabaseServerClient(); // auth-server (cookies)
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const password = typeof body.password === "string" ? body.password.trim() : "";

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Пароль должен быть не менее 8 символов" },
        { status: 400 }
      );
    }

    const service = createServiceClient();

    const { data: specialist, error: specError } = await service
      .from("specialists")
      .select("id, password_set_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (specError || !specialist) {
      return NextResponse.json(
        { error: "Профиль специалиста не найден" },
        { status: 404 }
      );
    }

    if ((specialist as { password_set_at?: string | null }).password_set_at) {
      return NextResponse.json(
        { error: "Пароль уже установлен" },
        { status: 400 }
      );
    }

    const { error: updateAuthError } = await service.auth.admin.updateUserById(
      user.id,
      { password }
    );

    if (updateAuthError) {
      console.error("[set-password] auth update failed", updateAuthError);
      return NextResponse.json(
        { error: "Не удалось установить пароль" },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();
    const { error: updateRowError } = await service
      .from("specialists")
      .update({
        password_set_at: now,
        claim_token_used_at: now,
      })
      .eq("id", specialist.id);

    if (updateRowError) {
      console.error("[set-password] specialist update failed", updateRowError);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[set-password] unexpected error", err);
    return NextResponse.json(
      { error: "Внутренняя ошибка" },
      { status: 500 }
    );
  }
}
