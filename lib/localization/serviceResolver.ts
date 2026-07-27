import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentLocale } from "./locales";

type ServiceRow = {
  id: string;
  title: string | null;
  description: string | null;
  price_comment: string | null;
};

type ServiceTranslationRow = {
  specialist_service_id: string;
  title: string | null;
  description: string | null;
  price_comment: string | null;
};

type ResolutionSource = "translation" | "legacy" | "none";

export type ResolvedServiceContent = {
  serviceId: string;
  title: string | null;
  description: string | null;
  priceComment: string | null;
  resolvedFrom: {
    title: ResolutionSource;
    description: ResolutionSource;
    priceComment: ResolutionSource;
  };
};

function nonEmptyTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function uniqueIds(ids: readonly string[]): string[] {
  return Array.from(new Set(ids.filter((id) => id.length > 0)));
}

function resolveField(
  translated: unknown,
  legacy: string | null
): { value: string | null; source: ResolutionSource } {
  const translatedValue = nonEmptyTrimmedString(translated);
  if (translatedValue !== null) {
    return { value: translatedValue, source: "translation" };
  }
  if (legacy !== null) {
    return { value: legacy, source: "legacy" };
  }
  return { value: null, source: "none" };
}

export async function resolveServiceContent(
  client: SupabaseClient,
  {
    serviceIds,
    locale,
  }: {
    serviceIds: readonly string[];
    locale: ContentLocale;
  }
): Promise<Map<string, ResolvedServiceContent | null>> {
  const ids = uniqueIds(serviceIds);
  const resolved = new Map<string, ResolvedServiceContent | null>();
  if (ids.length === 0) return resolved;

  const [servicesResult, translationsResult] = await Promise.all([
    client
      .from("specialist_services")
      .select("id, title, description, price_comment")
      .in("id", ids),
    client
      .from("specialist_service_translations")
      .select(
        "specialist_service_id, title, description, price_comment"
      )
      .in("specialist_service_id", ids)
      .eq("language_code", locale),
  ]);

  if (servicesResult.error) {
    throw new Error(
      `Failed to load specialist services: ${servicesResult.error.message}`
    );
  }
  if (translationsResult.error) {
    throw new Error(
      `Failed to load specialist service translations: ${translationsResult.error.message}`
    );
  }

  const serviceById = new Map(
    ((servicesResult.data ?? []) as ServiceRow[]).map((row) => [row.id, row])
  );
  const translationById = new Map(
    ((translationsResult.data ?? []) as ServiceTranslationRow[]).map((row) => [
      row.specialist_service_id,
      row,
    ])
  );

  for (const serviceId of ids) {
    const service = serviceById.get(serviceId);
    if (!service) {
      resolved.set(serviceId, null);
      continue;
    }

    const translation = translationById.get(serviceId);
    const title = resolveField(translation?.title, service.title);
    const description = resolveField(
      translation?.description,
      service.description
    );
    const priceComment = resolveField(
      translation?.price_comment,
      service.price_comment
    );

    resolved.set(serviceId, {
      serviceId,
      title: title.value,
      description: description.value,
      priceComment: priceComment.value,
      resolvedFrom: {
        title: title.source,
        description: description.source,
        priceComment: priceComment.source,
      },
    });
  }

  return resolved;
}
