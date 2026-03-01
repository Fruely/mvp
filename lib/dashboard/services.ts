export type PricingType = "fixed" | "range" | "hourly";

export type SpecialistService = {
  id: string;
  title: string;
  description: string | null;
  pricing_type: PricingType;
  price_from: number;
  price_to: number | null;
  currency: string;
  duration_minutes: number | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

type ServicePayload = {
  title: string;
  description: string | null;
  pricing_type: PricingType;
  price_from: number;
  price_to: number | null;
  currency: string;
  duration_minutes: number | null;
};

async function parseApiResponse<T>(response: Response): Promise<T> {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      json && typeof json.error === "string" ? json.error : "Запрос завершился с ошибкой";
    throw new Error(message);
  }
  return json as T;
}

export async function fetchServices(): Promise<SpecialistService[]> {
  const response = await fetch("/api/specialist/services", { cache: "no-store" });
  const result = await parseApiResponse<{ data: SpecialistService[] }>(response);
  return Array.isArray(result.data) ? result.data : [];
}

export async function createService(payload: ServicePayload): Promise<SpecialistService> {
  const response = await fetch("/api/specialist/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await parseApiResponse<{ data: SpecialistService }>(response);
  return result.data;
}

export async function updateService(
  id: string,
  payload: Partial<ServicePayload> & { is_active?: boolean }
): Promise<SpecialistService> {
  const response = await fetch("/api/specialist/services", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...payload }),
  });
  const result = await parseApiResponse<{ data: SpecialistService }>(response);
  return result.data;
}

export async function toggleService(id: string, isActive: boolean): Promise<SpecialistService> {
  return updateService(id, { is_active: isActive });
}

export async function deleteService(id: string): Promise<void> {
  const response = await fetch("/api/specialist/services", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  await parseApiResponse<{ success: true }>(response);
}

