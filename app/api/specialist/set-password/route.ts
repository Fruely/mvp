import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = createSupabaseServerClient(); // auth-server (cookies)
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return json({ error: "Not authenticated" }, 401);
    }

    const body = await request.json();
    const password = typeof body.password === "string" ? body.password.trim() : "";

    if (!password || password.length < 8) {
      return json({ error: "Пароль должен быть не менее 8 символов" }, 400);
    }

    const service = createServiceClient();

    const { data: specialist, error: specError } = await service
      .from("specialists")
      .select("id, password_set_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (specError || !specialist) {
      return json({ error: "Профиль специалиста не найден" }, 404);
    }

    if ((specialist as { password_set_at?: string | null }).password_set_at) {
      return json({ error: "Пароль уже установлен" }, 400);
    }

    const now = new Date().toISOString();
    const specialistId = specialist.id;

    // CAS lock: only one concurrent request can proceed to password setup.
    const { data: lockedSpecialist, error: lockError } = await service
      .from("specialists")
      .update({ claim_processing_at: now })
      .eq("id", specialistId)
      .is("claim_token_used_at", null)
      .is("claim_processing_at", null)
      .gt("claim_token_expires_at", now)
      .select("id")
      .maybeSingle();

    if (lockError) {
      console.error("[set-password] lock failed", lockError);
      return json({ error: "Не удалось начать установку пароля" }, 500);
    }

    if (!lockedSpecialist) {
      return json(
        { error: "Ссылка недействительна, уже использована или обрабатывается" },
        409
      );
    }

    const { error: updateAuthError } = await service.auth.admin.updateUserById(
      user.id,
      { password }
    );

    if (updateAuthError) {
      console.error("[set-password] auth update failed", updateAuthError);
      await service
        .from("specialists")
        .update({ claim_processing_at: null })
        .eq("id", specialistId)
        .eq("claim_processing_at", now);

      return json({ error: "Не удалось установить пароль" }, 500);
    }

    const { error: updateRowError } = await service
      .from("specialists")
      .update({
        password_set_at: now,
        claim_token_used_at: now,
        claim_processing_at: null,
      })
      .eq("id", specialistId)
      .eq("claim_processing_at", now);

    if (updateRowError) {
      console.error("[set-password] specialist update failed", updateRowError);
      return json({ error: "Пароль установлен, но завершение процесса не удалось" }, 500);
    }

    return json({ success: true });
  } catch (err: unknown) {
    console.error("[set-password] unexpected error", err);
    return json({ error: "Внутренняя ошибка" }, 500);
  }
}
