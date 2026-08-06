import type { SupabaseClient } from "@supabase/supabase-js";
import { STALE_PENDING_RESERVATION_MINUTES } from "@/lib/billing/planPaymentConstants";

/** Expire stale pending rows to release promoted_credit_id reservation (checkout route only). */
export async function expireStalePendingPlanPaymentReservations(
  supabase: SupabaseClient,
  promotedCreditId: string,
  now: Date = new Date(),
): Promise<number> {
  const staleBeforeMs = now.getTime() - STALE_PENDING_RESERVATION_MINUTES * 60 * 1000;
  const staleBeforeIso = new Date(staleBeforeMs).toISOString();
  const expiredAtIso = now.toISOString();

  const { data, error } = await supabase
    .from("plan_payments")
    .update({
      status: "expired",
      expired_at: expiredAtIso,
      updated_at: expiredAtIso,
    })
    .eq("promoted_credit_id", promotedCreditId)
    .eq("status", "pending")
    .lt("created_at", staleBeforeIso)
    .select("id");

  if (error) {
    console.info("[billing/plan-payment] stale_pending_expire_failed", {
      promotedCreditId,
    });
    return 0;
  }

  const count = data?.length ?? 0;
  if (count > 0) {
    console.info("[billing/plan-payment] stale_pending_expired", {
      promotedCreditId,
      count,
    });
  }
  return count;
}
