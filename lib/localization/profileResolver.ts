import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentLocale } from "./locales";

type ProfileRow = {
  specialist_id: string;
  about_me: string | null;
};

type ProfileTranslationRow = {
  specialist_id: string;
  about_me: string | null;
};

export type ResolvedProfileContent = {
  specialistId: string;
  aboutMe: string | null;
  resolvedFrom: "translation" | "legacy" | "none";
};

function nonEmptyTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function uniqueIds(ids: readonly string[]): string[] {
  return Array.from(new Set(ids.filter((id) => id.length > 0)));
}

export async function resolveProfileContent(
  client: SupabaseClient,
  {
    specialistIds,
    locale,
  }: {
    specialistIds: readonly string[];
    locale: ContentLocale;
  }
): Promise<Map<string, ResolvedProfileContent | null>> {
  const ids = uniqueIds(specialistIds);
  const resolved = new Map<string, ResolvedProfileContent | null>();
  if (ids.length === 0) return resolved;

  const [profilesResult, translationsResult] = await Promise.all([
    client
      .from("specialist_profiles")
      .select("specialist_id, about_me")
      .in("specialist_id", ids),
    client
      .from("specialist_profile_translations")
      .select("specialist_id, about_me")
      .in("specialist_id", ids)
      .eq("language_code", locale),
  ]);

  if (profilesResult.error) {
    throw new Error(
      `Failed to load specialist profiles: ${profilesResult.error.message}`
    );
  }
  if (translationsResult.error) {
    throw new Error(
      `Failed to load specialist profile translations: ${translationsResult.error.message}`
    );
  }

  const profileById = new Map(
    ((profilesResult.data ?? []) as ProfileRow[]).map((row) => [
      row.specialist_id,
      row,
    ])
  );
  const translationById = new Map(
    ((translationsResult.data ?? []) as ProfileTranslationRow[]).map((row) => [
      row.specialist_id,
      row,
    ])
  );

  for (const specialistId of ids) {
    const profile = profileById.get(specialistId);
    if (!profile) {
      resolved.set(specialistId, null);
      continue;
    }

    const translated = nonEmptyTrimmedString(
      translationById.get(specialistId)?.about_me
    );
    if (translated !== null) {
      resolved.set(specialistId, {
        specialistId,
        aboutMe: translated,
        resolvedFrom: "translation",
      });
      continue;
    }

    resolved.set(specialistId, {
      specialistId,
      aboutMe: profile.about_me ?? null,
      resolvedFrom: profile.about_me == null ? "none" : "legacy",
    });
  }

  return resolved;
}
