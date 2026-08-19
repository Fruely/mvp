/**
 * Plain-text Telegram details for NEW_SPECIALIST publish events.
 * sendTelegramToOwners does not set parse_mode.
 */

import {
  GERMANY_COUNTRY_CODE,
  areValidCoordinates,
  isAllowedServiceRadiusKm,
  normalizeWorkFormat,
  parseServiceRadiusKm,
} from "@/lib/specialists/geography";
import { isAsciiSlug } from "@/lib/publicUrls";

export type CategoryTitleRow = {
  id: string;
  parent_id: string | null;
  slug: string | null;
  title: string | null;
  title_ru: string | null;
  title_ua: string | null;
  title_de: string | null;
};

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t ? t : null;
}

export function sanitizeTelegramPlainText(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

export function pickInternalCategoryLabel(
  row: Partial<CategoryTitleRow> | null | undefined,
  fallbackId?: string | null
): string {
  if (!row) return trimOrNull(fallbackId) ?? "—";
  return (
    trimOrNull(row.title_ru) ||
    trimOrNull(row.title_ua) ||
    trimOrNull(row.title_de) ||
    trimOrNull(row.title) ||
    trimOrNull(row.slug) ||
    trimOrNull(row.id) ||
    trimOrNull(fallbackId) ||
    "—"
  );
}

export function formatCategoryNotifyBlock(input: {
  categoryId: string | null;
  selected: CategoryTitleRow | null;
  parent: CategoryTitleRow | null;
  loadError?: string | null;
}): string {
  if (input.loadError) {
    const id = input.categoryId == null ? "null" : sanitizeTelegramPlainText(input.categoryId);
    return ["⚠️ Ошибка загрузки категории", `Category ID: ${id}`].join("\n");
  }
  if (!input.categoryId) {
    return ["⚠️ Категория не определена", "Category ID: null"].join("\n");
  }
  if (!input.selected) {
    return [
      "⚠️ Категория не найдена",
      `Category ID: ${sanitizeTelegramPlainText(input.categoryId)}`,
    ].join("\n");
  }
  const slug = trimOrNull(input.selected.slug) ?? "—";
  if (slug === "other") {
    return [
      "⚠️ Выбрана категория other",
      `Slug: other`,
      `Category ID: ${sanitizeTelegramPlainText(input.selected.id)}`,
    ].join("\n");
  }

  const selectedLabel = sanitizeTelegramPlainText(
    pickInternalCategoryLabel(input.selected, input.selected.id)
  );
  const parentId = trimOrNull(input.selected.parent_id);
  const lines = ["📂 Категория:"];
  if (!parentId) {
    lines.push("Родительская: —");
    lines.push("Подкатегория: —");
    lines.push(`Выбрана корневая категория: ${selectedLabel}`);
  } else if (!input.parent) {
    lines.push(
      `Родительская: ⚠️ родитель не найден (${sanitizeTelegramPlainText(parentId)})`
    );
    lines.push(`Подкатегория: ${selectedLabel}`);
  } else {
    lines.push(
      `Родительская: ${sanitizeTelegramPlainText(
        pickInternalCategoryLabel(input.parent, parentId)
      )}`
    );
    lines.push(`Подкатегория: ${selectedLabel}`);
  }
  lines.push(`Slug: ${sanitizeTelegramPlainText(slug)}`);
  lines.push(`Category ID: ${sanitizeTelegramPlainText(input.selected.id)}`);
  return lines.join("\n");
}

export function formatGeographyNotifyBlock(input: {
  workFormat: string | null | undefined;
  postalCode: string | null | undefined;
  city: string | null | undefined;
  countryCode: string | null | undefined;
  lat: number | null | undefined;
  lng: number | null | undefined;
  serviceRadiusKm: number | null | undefined;
}): string {
  const wf = normalizeWorkFormat(input.workFormat);
  const formatLabel =
    wf === "online" ? "Online" : wf === "offline" ? "Offline" : wf === "hybrid" ? "Hybrid" : "—";

  const plz = trimOrNull(input.postalCode) ?? "—";
  const city = trimOrNull(input.city) ?? "—";
  const country = trimOrNull(input.countryCode)?.toUpperCase() ?? GERMANY_COUNTRY_CODE;
  const coordsOk = areValidCoordinates(input.lat, input.lng, { countryCode: country });
  const radius = parseServiceRadiusKm(input.serviceRadiusKm);

  const geoComplete =
    Boolean(wf) &&
    country === GERMANY_COUNTRY_CODE &&
    /^\d{5}$/.test(plz) &&
    city !== "—" &&
    coordsOk &&
    (wf === "online" || isAllowedServiceRadiusKm(radius));

  const lines = [
    `🗺 Формат: ${formatLabel}`,
    `📍 География: ${sanitizeTelegramPlainText(`${plz} ${city}, ${country}`)}`,
  ];

  if (wf === "online") {
    lines.push("📐 Зона обслуживания: не применяется");
  } else if (isAllowedServiceRadiusKm(radius)) {
    lines.push(`📐 Зона обслуживания: ${radius} км`);
  } else {
    lines.push("📐 Зона обслуживания: —");
  }

  lines.push(`🧭 Координаты: ${coordsOk ? "имеются" : "отсутствуют"}`);

  if (!geoComplete) {
    lines.push("⚠️ География профиля неполная");
  }

  return lines.join("\n");
}

export function buildNewSpecialistTelegramMessage(input: {
  name: string;
  details?: string | null;
}): string {
  let message = `Новый специалист:\n${input.name}`;
  const details = trimOrNull(input.details);
  if (details) message += `\n\n${details}`;
  return message;
}

export function formatSpecialistPublishNotifyDetails(input: {
  categoryBlock: string;
  geographyBlock: string;
  slug?: string | null;
  status?: string | null;
  siteUrl?: string | null;
}): string {
  const parts: string[] = [];
  if (input.categoryBlock.trim()) parts.push(input.categoryBlock.trim());
  if (input.geographyBlock.trim()) parts.push(input.geographyBlock.trim());

  const slug = trimOrNull(input.slug);
  const status = trimOrNull(input.status);
  const site = trimOrNull(input.siteUrl)?.replace(/\/$/, "") ?? null;
  if (slug || status) {
    const extra: string[] = [];
    if (slug && isAsciiSlug(slug)) {
      const path = `/ru/specialist/${slug}`;
      extra.push(`Профиль: ${sanitizeTelegramPlainText(site ? `${site}${path}` : path)}`);
    }
    if (status) extra.push(`Статус: ${sanitizeTelegramPlainText(status)}`);
    parts.push(extra.join("\n"));
  }
  return parts.join("\n\n");
}
