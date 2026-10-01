import type { SupabaseClient } from "@supabase/supabase-js";

import type { SpecialistDraftIdentity, SpecialistDraftStore } from "@/lib/specialists/ensureSpecialistDraft";

function isUniqueViolation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "23505") return true;
  return (error.message ?? "").toLowerCase().includes("duplicate key");
}

function readIdentity(row: Record<string, unknown> | null): SpecialistDraftIdentity | null {
  if (!row) return null;
  const id = typeof row.id === "string" ? row.id : null;
  if (!id) return null;
  const status = typeof row.status === "string" && row.status.trim() ? row.status : "draft";
  return { id, status };
}

export function supabaseSpecialistDraftStore(service: SupabaseClient): SpecialistDraftStore {
  return {
    async findByUserId(userId) {
      const { data, error } = await service
        .from("specialists")
        .select("id, status")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("[specialist/draft] lookup failed", error.message);
        throw new Error("specialist_lookup_failed");
      }

      return readIdentity(data as Record<string, unknown> | null);
    },

    async insertDraft(input) {
      const { data, error } = await service
        .from("specialists")
        .insert({
          user_id: input.userId,
          name: null,
          email: input.email,
          status: "draft",
          is_active: false,
          is_visible: false,
        })
        .select("id, status")
        .maybeSingle();

      if (error) {
        if (isUniqueViolation(error)) {
          return { ok: false, reason: "duplicate" };
        }
        console.error("[specialist/draft] insert failed", error.message);
        return { ok: false, reason: "failed" };
      }

      const specialist = readIdentity(data as Record<string, unknown> | null);
      if (!specialist) {
        return { ok: false, reason: "failed" };
      }
      return { ok: true, specialist };
    },

    async ensureProfileRow(specialistId) {
      const { error } = await service
        .from("specialist_profiles")
        .insert({ specialist_id: specialistId })
        .select("specialist_id")
        .maybeSingle();

      if (error && !isUniqueViolation(error)) {
        console.warn("[specialist/draft] profile row init failed", error.message);
      }
    },
  };
}
