import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      specialist_id,
      client_name,
      client_email,
      client_phone,
      message,
    } = body;

    if (!specialist_id || typeof specialist_id !== "string") {
      return Response.json(
        { error: "specialist_id is required" },
        { status: 400 }
      );
    }

    if (!client_email && !client_phone) {
      return Response.json(
        { error: "client_email or client_phone is required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data: specialist, error: specialistError } = await supabase
      .from("specialists")
      .select("id")
      .eq("id", specialist_id)
      .maybeSingle();

    if (specialistError) {
      return Response.json(
        { error: "Failed to verify specialist" },
        { status: 500 }
      );
    }

    if (!specialist) {
      return Response.json(
        { error: "Specialist not found" },
        { status: 404 }
      );
    }

    const insertPayload = {
      specialist_id,
      client_name: client_name || null,
      client_email: client_email || null,
      client_phone: client_phone || null,
      message: message || null,
    };

    const { data, error } = await supabase
      .from("leads")
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      return Response.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return Response.json({ data }, { status: 200 });
  } catch (err: any) {
    return Response.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}
