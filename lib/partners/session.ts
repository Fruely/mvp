import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect";
import { createSupabaseServerComponentClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import {
  canAccessPartnerDashboard,
  partnerAccessMode,
  type PartnerAccessMode,
} from "./access";
import { PartnerDomainError } from "@/lib/partners/errors";
import type { PartnerRow } from "@/lib/partners/types";

export type { PartnerAccessMode };
export { partnerAccessMode, canAccessPartnerDashboard };

export type PartnerSession = {
  user: { id: string; email?: string | null };
  partner: PartnerRow;
  accessMode: PartnerAccessMode;
};

export async function getPartnerForUser(
  userId: string,
  service = createServiceClient()
): Promise<PartnerRow | null> {
  if (!userId.trim()) return null;
  const { data, error } = await service
    .from("partners")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[partners/session] lookup failed", error.message);
    return null;
  }
  return (data as PartnerRow) ?? null;
}

/**
 * Page/layout guard: requires auth + bound partner with dashboard access.
 * Redirects to login or claim when missing.
 */
export async function requirePartnerSession(options?: {
  lang?: string;
  loginPath?: string;
}): Promise<PartnerSession> {
  const lang = options?.lang && ["ua", "ru", "de"].includes(options.lang) ? options.lang : "ua";
  const loginPath = options?.loginPath ?? `/login`;
  const claimPath = `/${lang}/partner/claim`;

  const supabase = createSupabaseServerComponentClient();
  const service = createServiceClient();

  let user;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      redirect(loginPath);
    }
    user = data.user;
  } catch (e) {
    if (isRedirectError(e)) throw e;
    console.error("[partners/session] getUser crash", e);
    redirect(loginPath);
  }

  if (!user) redirect(loginPath);

  const partner = await getPartnerForUser(user.id, service);
  if (!partner) {
    redirect(claimPath);
  }

  if (!canAccessPartnerDashboard(partner.status)) {
    redirect(`/${lang}/partners`);
  }

  return {
    user: { id: user.id, email: user.email },
    partner,
    accessMode: partnerAccessMode(partner.status),
  };
}

/**
 * API guard: session → partner. Never accepts client partnerId.
 */
export async function requirePartnerApiSession(): Promise<PartnerSession> {
  const { createSupabaseServerClient } = await import("@/lib/supabase/auth-server");
  const supabase = createSupabaseServerClient();
  const service = createServiceClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new PartnerDomainError("not_authenticated", 401);
  }

  const partner = await getPartnerForUser(user.id, service);
  if (!partner) {
    throw new PartnerDomainError("partner_not_bound", 403);
  }

  if (!canAccessPartnerDashboard(partner.status)) {
    throw new PartnerDomainError("partner_access_denied", 403);
  }

  return {
    user: { id: user.id, email: user.email },
    partner,
    accessMode: partnerAccessMode(partner.status),
  };
}
