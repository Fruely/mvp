export const SERVICE_REQUEST_STATUSES = [
  "new",
  "reviewing",
  "searching",
  "matched",
  "closed",
  "cancelled",
  "spam",
] as const;

export type ServiceRequestStatus = (typeof SERVICE_REQUEST_STATUSES)[number];

export const SERVICE_REQUEST_URGENCIES = [
  "asap",
  "within_24h",
  "within_3_days",
  "within_week",
  "within_month",
  "flexible",
  "specific_date",
] as const;

export type ServiceRequestUrgency = (typeof SERVICE_REQUEST_URGENCIES)[number];

export const SERVICE_REQUEST_WORK_FORMATS = ["online", "offline", "hybrid"] as const;

export type ServiceRequestWorkFormat = (typeof SERVICE_REQUEST_WORK_FORMATS)[number];

export const SERVICE_REQUEST_SOURCE = "assisted_search" as const;

export const DESCRIPTION_MAX_LEN = 5000;
