/**
 * Temporary production canary gate.
 * Delete this module after the controlled matching test.
 * The env value is never logged.
 */

export const MATCHING_CANARY_SPECIALIST_ENV = "SERVICE_REQUEST_MATCHING_CANARY_SPECIALIST_ID";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CanaryGate =
  | { mode: "off" }
  | { mode: "allow"; specialistId: string }
  | { mode: "closed" };

export type CanaryMatch = { specialist_id: string };

function readCanaryGate(env: NodeJS.ProcessEnv): CanaryGate {
  const raw = env[MATCHING_CANARY_SPECIALIST_ENV];
  if (raw === undefined) return { mode: "off" };
  if (UUID.test(raw)) return { mode: "allow", specialistId: raw.toLowerCase() };
  return { mode: "closed" };
}

/**
 * Absent env keeps the natural set.
 * One exact UUID keeps only that natural specialist.
 * Any other present value keeps nobody.
 */
export function applyMatchingCanary<T extends CanaryMatch>(
  matches: readonly T[],
  context: { serviceRequestId: string | null },
  env: NodeJS.ProcessEnv = process.env,
): T[] {
  const gate = readCanaryGate(env);
  if (gate.mode === "off") return [...matches];

  if (gate.mode === "closed") {
    console.info("[matching] matching_canary_invalid_config", {
      serviceRequestId: context.serviceRequestId,
      beforeCount: matches.length,
      afterCount: 0,
    });
    return [];
  }

  const allowed = matches.filter((match) => match.specialist_id.toLowerCase() === gate.specialistId);
  const fields = {
    serviceRequestId: context.serviceRequestId,
    specialistId: gate.specialistId,
    beforeCount: matches.length,
    afterCount: allowed.length,
  };
  console.info("[matching] matching_canary_active", fields);
  console.info("[matching] matching_canary_filtered", fields);
  return allowed;
}
