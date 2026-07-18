import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect";
import { isPublicationReadyForDashboard } from "@/lib/dashboard/publicationReadiness";
import { createSupabaseServerComponentClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { specialistLangBecomePath } from "@/lib/specialists/navigation";

/** Marketplace v2 canonical statuses + legacy compatibility during rollout. */
export type SpecialistStatus =
  | "draft"
  | "published_unverified"
  | "featured_verified"
  | "blocked"
  | "approved"
  | "paused"
  | "pending";

export type SpecialistRow = {
  id: string;
  user_id: string | null;
  first_name: string | null;
  name?: string | null;
  email: string | null;
  phone: string | null;
  category_id?: string | null;
  status: string | null;
  password_set_at?: string | null;
};

export type SpecialistOnboardingGateState = "incomplete" | "ready" | "published";

const PUBLISHED_SPECIALIST_STATUSES = new Set<string>([
  "published_unverified",
  "featured_verified",
  "approved",
  "paused",
]);

export function isPublishedSpecialistStatus(status: string | null | undefined): boolean {
  return Boolean(status && PUBLISHED_SPECIALIST_STATUSES.has(status));
}

function toSpecialistRow(row: Record<string, unknown> | null): SpecialistRow | null {
  if (!row) return null;
  const first_name = (row.name as string) ?? (row.first_name as string) ?? null;
  return { ...row, first_name } as SpecialistRow;
}

// Table has "name"; some code expects "first_name" — we map name → first_name when returning
const COLS =
  "id, user_id, name, email, phone, category_id, status, password_set_at";

export async function getSpecialistOnboardingGateState(
  specialist: SpecialistRow,
  service = createServiceClient(),
): Promise<{
  state: SpecialistOnboardingGateState;
  publicationReady: boolean;
}> {
  if (isPublishedSpecialistStatus(specialist.status)) {
    return { state: "published", publicationReady: true };
  }

  const { data: specExtra } = await service
    .from("specialists")
    .select("name, category_id, postal_code, work_format, languages, service_radius_km")
    .eq("id", specialist.id)
    .maybeSingle();

  const categoryId =
    typeof specExtra?.category_id === "string"
      ? specExtra.category_id
      : typeof specialist.category_id === "string"
        ? specialist.category_id
        : "";

  const { data: categoryRow } = categoryId
    ? await service
        .from("categories")
        .select("parent_id")
        .eq("id", categoryId)
        .maybeSingle()
    : { data: null };

  const { data: servicesRows } = await service
    .from("specialist_services")
    .select("title, price_from, is_active, category_id")
    .eq("specialist_id", specialist.id);

  const name =
    typeof specExtra?.name === "string"
      ? specExtra.name
      : specialist.first_name?.trim() || specialist.name?.trim() || "";
  const languages = Array.isArray(specExtra?.languages)
    ? (specExtra.languages as unknown[]).filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      )
    : [];
  const workFormat =
    specExtra?.work_format === "online" ||
    specExtra?.work_format === "offline" ||
    specExtra?.work_format === "hybrid"
      ? String(specExtra.work_format)
      : "online";
  const postalCode = typeof specExtra?.postal_code === "string" ? specExtra.postal_code : "";
  const serviceRadiusKm =
    typeof specExtra?.service_radius_km === "number" && Number.isFinite(specExtra.service_radius_km)
      ? specExtra.service_radius_km
      : null;
  const categoryParentId =
    categoryRow && typeof categoryRow.parent_id === "string" ? categoryRow.parent_id : null;
  const servicesInSelectedCategory = (servicesRows ?? []).filter(
    (row) => row.is_active === true && typeof row.category_id === "string" && row.category_id === categoryId,
  );

  const publicationReady = isPublicationReadyForDashboard({
    name,
    categoryId,
    categoryParentId,
    languages,
    workFormat,
    postalCode,
    serviceRadiusKm,
    servicesInSelectedCategory,
  });

  return { state: publicationReady ? "ready" : "incomplete", publicationReady };
}

export async function getCurrentUserAndSpecialist() {
  const supabase = createSupabaseServerComponentClient();
  const service = createServiceClient();

  let user;
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      redirect("/login");
    }

    user = data.user;
  } catch (e) {
    if (isRedirectError(e)) {
      throw e;
    }

    console.error("[auth] getUser crash", e);
    redirect("/login");
  }

  if (!user) {
    redirect("/login");
  }

  const { data: specRow, error: specError } = await service
    .from("specialists")
    .select(COLS)
    .eq("user_id", user.id)
    .neq("status", "blocked")
    .maybeSingle();

  if (specError) {
    console.error("[specialists/server] failed to load specialist", specError);
  }

  let specialist: SpecialistRow | null = toSpecialistRow(specRow);

  if (!specialist) {
    const normalizedEmail = typeof user.email === "string" ? user.email.trim().toLowerCase() : null;
    const { data: created, error: createError } = await service
      .from("specialists")
      .insert({
        user_id: user.id,
        name: null,
        email: normalizedEmail,
        status: "draft",
        is_active: false,
        is_visible: false,
      })
      .select(COLS)
      .maybeSingle();

    if (createError) {
      console.error("[specialists/server] failed to auto-create draft specialist", createError);
    }
    specialist = toSpecialistRow(created);
  }

  if (!specialist) {
    redirect(specialistLangBecomePath());
  }

  return {
    user,
    specialist,
  };
}
