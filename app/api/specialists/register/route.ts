import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email && email.includes("@") ? email : null;
}

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const phone = value.trim();
  return phone.length >= 6 ? phone : null;
}

function normalizePassword(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const password = value.trim();
  return password.length >= 8 ? password : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const email = normalizeEmail(body?.email);
    const phone = normalizePhone(body?.phone);
    const password = normalizePassword(body?.password);

    if (!email || !phone || !password) {
      return jsonNoStore(
        { error: "email, phone и password обязательны; password минимум 8 символов." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data: existingSpecialist } = await supabase
      .from("specialists")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existingSpecialist?.id) {
      return jsonNoStore({ error: "Специалист с таким email уже существует." }, { status: 409 });
    }

    const { data: createdUser, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (userError || !createdUser?.user?.id) {
      return jsonNoStore(
        { error: userError?.message || "Не удалось создать пользователя." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const { data: specialist, error: specialistError } = await supabase
      .from("specialists")
      .insert({
        user_id: createdUser.user.id,
        name: null,
        email,
        phone,
        status: "draft",
        is_active: false,
        is_visible: false,
        created_at: now,
      })
      .select("id, email, phone, status")
      .single();

    if (specialistError || !specialist) {
      await supabase.auth.admin.deleteUser(createdUser.user.id).catch(() => undefined);
      return jsonNoStore(
        { error: specialistError?.message || "Не удалось создать профиль специалиста." },
        { status: 500 }
      );
    }

    const { error: profileError } = await supabase
      .from("specialist_profiles")
      .insert({ specialist_id: specialist.id })
      .select("specialist_id")
      .maybeSingle();

    if (profileError) {
      // Non-fatal: dashboard can still operate and create profile later.
      console.warn("[specialists/register] specialist profile init failed", profileError.message);
    }

    return jsonNoStore({ success: true, specialist }, { status: 201 });
  } catch (error: any) {
    return jsonNoStore(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
