import { jsonNoStore } from "@/lib/api/response";
import {
  buildUpdatedLaunchVideoGuideState,
  parseSpecialistOnboardingState,
  type VideoGuideAction,
} from "@/lib/specialists/onboardingState";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

type Payload = {
  action?: VideoGuideAction;
};

function isValidAction(value: unknown): value is VideoGuideAction {
  return value === "opened" || value === "watched" || value === "snoozed";
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonNoStore({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Payload | null;
  const action = body?.action;
  if (!isValidAction(action)) {
    return jsonNoStore(
      { error: "Invalid payload: action must be opened, watched or snoozed" },
      { status: 400 }
    );
  }

  const { data: specialist, error: specialistError } = await supabase
    .from("specialists")
    .select("id, onboarding_state")
    .eq("user_id", user.id)
    .maybeSingle();

  if (specialistError || !specialist?.id) {
    return jsonNoStore({ error: "Specialist not found" }, { status: 404 });
  }

  const currentState = parseSpecialistOnboardingState(specialist.onboarding_state);
  const nextState = buildUpdatedLaunchVideoGuideState({
    currentState,
    action,
    now: new Date(),
  });

  const { error: updateError } = await supabase
    .from("specialists")
    .update({
      onboarding_state: nextState,
      updated_at: new Date().toISOString(),
    })
    .eq("id", specialist.id);

  if (updateError) {
    return jsonNoStore({ error: "Failed to update onboarding state" }, { status: 500 });
  }

  return jsonNoStore({
    success: true,
    action,
    launchVideoGuide: nextState.launchVideoGuide ?? null,
  });
}
