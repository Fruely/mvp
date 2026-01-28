import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/.+/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, email, category_slug, city, postal_code, proof_link, phone, languages } = body;

    // ─────────────────────────────────────────────
    // 1️⃣ VALIDATION
    // ─────────────────────────────────────────────

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Ім'я обов'язкове" },
        { status: 400 }
      );
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "Невірний формат email" },
        { status: 400 }
      );
    }

    if (!category_slug || !category_slug.trim()) {
      return NextResponse.json(
        { error: "Категорія обов'язкова" },
        { status: 400 }
      );
    }

    if ((!city || !city.trim()) && (!postal_code || !postal_code.trim())) {
      return NextResponse.json(
        { error: "Вкажіть місто або поштовий індекс" },
        { status: 400 }
      );
    }

    if (!proof_link || !proof_link.trim()) {
      return NextResponse.json(
        { error: "Посилання обов'язкове" },
        { status: 400 }
      );
    }

    if (!URL_REGEX.test(proof_link)) {
      return NextResponse.json(
        { error: "Невірний формат посилання" },
        { status: 400 }
      );
    }

    if (!Array.isArray(languages) || languages.length === 0) {
      return NextResponse.json(
        { error: "Виберіть хоча б одну мову" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();
    const normalizedCity = city?.trim() || null;
    const normalizedPostalCode = postal_code?.trim() || null;
    const normalizedProofLink = proof_link.trim();

    // ─────────────────────────────────────────────
    // 2️⃣ Create Supabase service client
    // ─────────────────────────────────────────────

    const supabase = createSupabaseServerClient();

    // ─────────────────────────────────────────────
    // 3️⃣ Check email uniqueness
    // ─────────────────────────────────────────────

    const { data: existing, error: emailCheckError } = await supabase
      .from("specialists")
      .select("id, status")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (emailCheckError) {
      console.error("Email check failed:", emailCheckError);
      return NextResponse.json(
        { error: "Помилка бази даних" },
        { status: 500 }
      );
    }

    if (existing) {
      // If already exists and not email_unverified, reject
      if (existing.status !== "email_unverified") {
        return NextResponse.json(
          { error: "Спеціаліст з таким email вже існує" },
          { status: 409 }
        );
      }
      // If email_unverified, we can update the existing record
    }

    // ─────────────────────────────────────────────
    // 4️⃣ Resolve category slug → UUID
    // ─────────────────────────────────────────────

    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", category_slug)
      .maybeSingle();

    if (categoryError || !category) {
      return NextResponse.json(
        { error: "Невірна категорія" },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────
    // 5️⃣ Generate email verification token
    // ─────────────────────────────────────────────

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.VERCEL_URL ||
      "http://localhost:3000";
    const verifyUrl = `${baseUrl}/api/specialists/verify-email?token=${verificationToken}&email=${encodeURIComponent(normalizedEmail)}`;

    // ─────────────────────────────────────────────
    // 6️⃣ Insert or update application
    // ─────────────────────────────────────────────

    const applicationData = {
      name: normalizedName,
      email: normalizedEmail,
      phone: phone?.trim() || null,
      category_id: category.id,
      city: normalizedCity,
      postal_code: normalizedPostalCode,
      proof_link: normalizedProofLink,
      languages: languages,
      status: "email_unverified",
      email_verification_token: verificationToken,
      profile_status: "draft",
      subscription_status: "inactive",
      is_approved: false,
      is_active: false,
      is_visible: false,
    };

    let applicationId: string;

    if (existing && existing.status === "email_unverified") {
      // Update existing unverified application
      const { data: updated, error: updateError } = await supabase
        .from("specialists")
        .update(applicationData)
        .eq("id", existing.id)
        .select("id")
        .single();

      if (updateError) {
        console.error("Application update failed:", updateError);
        return NextResponse.json(
          { error: "Не вдалося оновити заявку" },
          { status: 500 }
        );
      }

      applicationId = updated.id;
    } else {
      // Insert new application
      const { data: inserted, error: insertError } = await supabase
        .from("specialists")
        .insert(applicationData)
        .select("id")
        .single();

      if (insertError) {
        console.error("Application insert failed:", insertError);
        return NextResponse.json(
          { error: "Не вдалося створити заявку" },
          { status: 500 }
        );
      }

      applicationId = inserted.id;
    }

    // ─────────────────────────────────────────────
    // 7️⃣ Send verification email
    // ─────────────────────────────────────────────

    const emailSubject = "Підтвердіть email для розгляду заявки Freuly";
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Підтвердження email</h2>
        <p>Вітаємо, ${normalizedName}!</p>
        <p>Дякуємо за вашу заявку на платформі Freuly. Для продовження розгляду заявки, будь ласка, підтвердіть ваш email.</p>
        <p style="margin: 30px 0;">
          <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Підтвердити email
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          Якщо кнопка не працює, скопіюйте та вставте це посилання в браузер:<br>
          <a href="${verifyUrl}">${verifyUrl}</a>
        </p>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Після підтвердження ваша заявка буде розглянута вручну нашою командою.
        </p>
      </div>
    `;

    try {
      await sendEmail({
        to: normalizedEmail,
        subject: emailSubject,
        body: emailBody,
      });
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Don't fail the request if email fails, but log it
    }

    // ─────────────────────────────────────────────
    // 8️⃣ Success
    // ─────────────────────────────────────────────

    return NextResponse.json(
      {
        success: true,
        application_id: applicationId,
        message: "Заявку створено. Перевірте email для підтвердження.",
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Внутрішня помилка сервера", details: err.message },
      { status: 500 }
    );
  }
}
