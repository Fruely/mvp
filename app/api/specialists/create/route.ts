import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Accept common single-level domains like name@example.com and multi-level domains
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEPRECATION_HEADERS = {
  "X-API-Deprecated": "true",
  "X-API-Replacement": "/api/specialists/application",
};
const DEPRECATION_PAYLOAD = {
  deprecated: true,
  replacement: "/api/specialists/application",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      name,
      email,
      phone,
      bio,
      category_id,   // this is slug from frontend
      languages,
      hourly_rate,
      avatar_url
    } = body;

    // ─────────────────────────────────────────────
    // 1️⃣ HARD VALIDATION (match Supabase constraints)
    // ─────────────────────────────────────────────

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required", ...DEPRECATION_PAYLOAD },
        { status: 400, headers: DEPRECATION_HEADERS }
      );
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        {
          error: "Invalid email format. Use e.g. name@domain.co.uk",
          ...DEPRECATION_PAYLOAD,
        },
        { status: 400, headers: DEPRECATION_HEADERS }
      );
    }

    if (!phone || !phone.trim()) {
      return NextResponse.json(
        { error: "Phone is required", ...DEPRECATION_PAYLOAD },
        { status: 400, headers: DEPRECATION_HEADERS }
      );
    }

    if (!category_id || !category_id.trim()) {
      return NextResponse.json(
        { error: "Category is required", ...DEPRECATION_PAYLOAD },
        { status: 400, headers: DEPRECATION_HEADERS }
      );
    }

    if (!Array.isArray(languages) || languages.length === 0) {
      return NextResponse.json(
        { error: "At least one language is required", ...DEPRECATION_PAYLOAD },
        { status: 400, headers: DEPRECATION_HEADERS }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    // ─────────────────────────────────────────────
    // 2️⃣ Create Supabase service client
    // ─────────────────────────────────────────────

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    // ─────────────────────────────────────────────
    // 3️⃣ Check email uniqueness
    // ─────────────────────────────────────────────

    const { data: existing, error: emailCheckError } = await supabase
      .from("specialists")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (emailCheckError) {
      console.error("Email check failed:", emailCheckError);
      return NextResponse.json(
        { error: "Database error", ...DEPRECATION_PAYLOAD },
        { status: 500, headers: DEPRECATION_HEADERS }
      );
    }

    if (existing) {
      return NextResponse.json(
        {
          error: "Specialist with this email already exists",
          ...DEPRECATION_PAYLOAD,
        },
        { status: 409, headers: DEPRECATION_HEADERS }
      );
    }

    // ─────────────────────────────────────────────
    // 4️⃣ Resolve category slug → UUID
    // ─────────────────────────────────────────────

    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", category_id)
      .maybeSingle();

    if (categoryError || !category) {
      return NextResponse.json(
        { error: "Invalid category", ...DEPRECATION_PAYLOAD },
        { status: 400, headers: DEPRECATION_HEADERS }
      );
    }

    // ─────────────────────────────────────────────
    // 5️⃣ Insert specialist (100% schema-safe)
    // ─────────────────────────────────────────────

    const { data: specialist, error: insertError } = await supabase
      .from("specialists")
      .insert({
        name: name.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        bio: bio?.trim() || null,
        category_id: category.id,
        languages,
        hourly_rate: hourly_rate || null,
        avatar_url: avatar_url || null,
        status: "pending",
        profile_status: "draft",
        subscription_status: "inactive",
        is_approved: false,
        is_active: false,
        is_visible: false
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Specialist insert failed:", insertError.message);
      return NextResponse.json(
        { error: "Unable to create specialist", ...DEPRECATION_PAYLOAD },
        { status: 500, headers: DEPRECATION_HEADERS }
      );
    }

    // ─────────────────────────────────────────────
    // 6️⃣ Real success
    // ─────────────────────────────────────────────

    return NextResponse.json(
      { success: true, specialist_id: specialist.id, ...DEPRECATION_PAYLOAD },
      { status: 201, headers: DEPRECATION_HEADERS }
    );
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err.message, ...DEPRECATION_PAYLOAD },
      { status: 500, headers: DEPRECATION_HEADERS }
    );
  }
}
