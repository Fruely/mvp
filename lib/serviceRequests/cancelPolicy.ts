import { SERVICE_REQUEST_STATUSES, type ServiceRequestStatus } from "./constants";

/**
 * Client-owned cancellation policy.
 *
 * `service_requests.status` is documented as a manual owner/admin queue field.
 * The repo has no client cancellation route, UI, or transition graph today.
 * Admin status updates accept any value in SERVICE_REQUEST_STATUSES without
 * checking the current status.
 *
 * This policy is therefore fail-closed and only allows the pre-match operator
 * states that still mean "request is being processed, no specialist assigned":
 * `new`, `reviewing`, `searching`.
 *
 * Explicitly disallowed:
 * - `matched` — operator-set after a specialist is found; no product rule
 *   permits the client to unwind that match.
 * - `closed` — terminal admin outcome.
 * - `spam` — admin-only classification.
 *
 * `cancelled` is not a source transition. Repeat cancel is idempotent success.
 */
export const CLIENT_CANCELLABLE_SERVICE_REQUEST_STATUSES = [
  "new",
  "reviewing",
  "searching",
] as const satisfies readonly ServiceRequestStatus[];

export type ClientCancellableServiceRequestStatus =
  (typeof CLIENT_CANCELLABLE_SERVICE_REQUEST_STATUSES)[number];

export const CLIENT_CANCELLED_SERVICE_REQUEST_STATUS = "cancelled" as const satisfies ServiceRequestStatus;

export const CLIENT_CANCEL_DISALLOWED_SERVICE_REQUEST_STATUSES = SERVICE_REQUEST_STATUSES.filter(
  (status) =>
    status !== CLIENT_CANCELLED_SERVICE_REQUEST_STATUS &&
    !(CLIENT_CANCELLABLE_SERVICE_REQUEST_STATUSES as readonly string[]).includes(status),
);

export function isClientCancellableServiceRequestStatus(
  status: unknown,
): status is ClientCancellableServiceRequestStatus {
  return (
    typeof status === "string" &&
    (CLIENT_CANCELLABLE_SERVICE_REQUEST_STATUSES as readonly string[]).includes(status)
  );
}

export function isClientCancelledServiceRequestStatus(status: unknown): boolean {
  return status === CLIENT_CANCELLED_SERVICE_REQUEST_STATUS;
}
