import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";
import {
  checkRateLimit,
  getClientIP,
  hashEmailForRateLimit,
  RATE_LIMIT_PUBLIC_MESSAGE,
} from "@/lib/rate-limit/shared";

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

function normalizeName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  if (!name) return null;

  const parts = name.split(" ").filter(Boolean);
  if (parts.length < 2) return null;

  const firstName = parts[0];
  const lastName = parts[1];
  if (firstName.length < 2 || lastName.length < 2) return null;

  return name;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const name = normalizeName(body?.name);
    const email = normalizeEmail(body?.email);
    const phone = normalizePhone(body?.phone);
    const password = normalizePassword(body?.password);
    const specialistRulesAccepted = body?.specialist_rules_accepted === true;

    if (!specialistRulesAccepted) {
      return jsonNoStore(
        { error: "specialist_rules_required" },
        { status: 400 }
      );
    }

    if (!name || !email || !phone || !password) {
      return jsonNoStore(
        {
          error:
            "name, email, phone и password обязательны; name требует имя и фамилию (минимум 2 символа), password минимум 8 символов.",
        },
        { status: 400 }
      );
    }

    const ip = getClientIP(request);
    const ipLimit = await checkRateLimit(request, {
      namespace: "specialist_register:ip",
      identifier: ip,
      limit: 30,
      windowSeconds: 3600,
    });
    if (!ipLimit.allowed) {
      return jsonNoStore(
        { error: RATE_LIMIT_PUBLIC_MESSAGE },
        {
          status: 429,
          headers: { "Retry-After": String(ipLimit.retryAfterSec ?? 60) },
        }
      );
    }

    const emailLimit = await checkRateLimit(request, {
      namespace: "specialist_register:email",
      identifier: hashEmailForRateLimit(email),
      limit: 10,
      windowSeconds: 86400,
    });
    if (!emailLimit.allowed) {
      return jsonNoStore(
        { error: RATE_LIMIT_PUBLIC_MESSAGE },
        {
          status: 429,
          headers: { "Retry-After": String(emailLimit.retryAfterSec ?? 60) },
        }
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
    const rulesVersion = process.env.SPECIALIST_RULES_VERSION || "1";
    const { data: specialist, error: specialistError } = await supabase
      .from("specialists")
      .insert({
        user_id: createdUser.user.id,
        name,
        email,
        phone,
        status: "draft",
        is_active: false,
        is_visible: false,
        created_at: now,
        specialist_rules_accepted_at: now,
        specialist_rules_version: rulesVersion,
      })
      .select("id, name, email, phone, status")
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
