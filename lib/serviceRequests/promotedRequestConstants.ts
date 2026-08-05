/** Public promotion fields for locked specialist view — no service_request join. */
export const PROMOTED_REQUEST_PROMOTION_PUBLIC_SELECT =
  "id, public_title, public_summary, locale, status, published_at, closed_at";

/** Internal promotion fields for unlocked server path only — never sent to locked client props. */
export const PROMOTED_REQUEST_PROMOTION_UNLOCK_SELECT =
  "id, service_request_id, public_title, public_summary, locale, status, published_at, closed_at";

export const PROMOTED_REQUEST_GRANT_PAGE_SELECT =
  "id, source_type, granted_at, revoked_at";

export const PROMOTED_REQUEST_PAYMENT_PAGE_SELECT =
  "status, created_at, paid_at, failed_at, expired_at, refunded_at, disputed_at";

export const PROMOTED_REQUEST_SERVICE_REQUEST_UNLOCK_SELECT =
  "description, client_name, client_email, client_phone, category_id, urgency, created_at, city, postal_code, work_format";
