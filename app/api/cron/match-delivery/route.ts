import { NextRequest, NextResponse } from "next/server";
import { deliverPendingOutbox, scheduleDueReminders } from "@/lib/inbox/delivery";
import { scheduleClientReminders } from "@/lib/selection/interest";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createSupabaseServerClient();
    const reminders = await scheduleDueReminders(supabase);
    const clientReminders = await scheduleClientReminders(supabase);
    const delivery = await deliverPendingOutbox(supabase);
    return NextResponse.json(
      { scheduled: reminders.scheduled, clientReminders: clientReminders.scheduled, processed: delivery.processed },
      { status: 200 },
    );
  } catch (error) {
    console.error("[cron/match-delivery] failed", {
      name: error instanceof Error ? error.name : "Error",
    });
    return NextResponse.json({ error: "delivery_failed" }, { status: 500 });
  }
}
