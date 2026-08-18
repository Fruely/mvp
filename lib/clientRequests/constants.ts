export const CLIENT_REQUEST_HISTORY_DEFAULT_LIMIT = 20;
export const CLIENT_REQUEST_HISTORY_MAX_LIMIT = 50;

export const CLIENT_REQUEST_KINDS = ["lead", "service_request"] as const;
export type ClientRequestKind = (typeof CLIENT_REQUEST_KINDS)[number];

export const LEAD_CLIENT_STATUSES = ["new", "accepted", "contacted", "closed"] as const;
export type LeadClientStatus = (typeof LEAD_CLIENT_STATUSES)[number];
