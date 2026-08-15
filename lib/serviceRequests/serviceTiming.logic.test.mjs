import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "./serviceTiming") {
      return { url: new URL("./serviceTiming.ts", import.meta.url).href, shortCircuit: true };
    }
    if (specifier === "./constants" && context.parentURL?.includes("serviceTiming.ts")) {
      return { url: new URL("./constants.ts", import.meta.url).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const { formatServiceTimingDisplay, mapServiceTimingToLegacyUrgency, validateServiceTiming } =
  await import("./serviceTiming.ts");
const { buildOwnerTelegramTimingPayload } = await import("./ownerTelegramTiming.ts");

test("asap timing validates", () => {
  const result = validateServiceTiming({ service_timing_type: "asap" });
  assert.equal(result.service_timing_type, "asap");
  assert.deepEqual(mapServiceTimingToLegacyUrgency(result), {
    urgency: "asap",
    desired_date: null,
  });
});

test("exact datetime requires date and time", () => {
  assert.match(
    validateServiceTiming({
      service_timing_type: "exact_datetime",
      service_timing_date: "2026-08-18",
    }).error ?? "",
    /service_timing_time/i,
  );
  const ok = validateServiceTiming({
    service_timing_type: "exact_datetime",
    service_timing_date: "2026-08-18",
    service_timing_time: "15:00",
  });
  assert.equal(ok.service_timing_type, "exact_datetime");
});

test("date range rejects invalid order", () => {
  const bad = validateServiceTiming({
    service_timing_type: "date_range",
    service_timing_date: "2026-08-25",
    service_timing_date_end: "2026-08-20",
  });
  assert.match(bad.error ?? "", /range/i);
});

test("flexible period requires period", () => {
  const bad = validateServiceTiming({ service_timing_type: "flexible_period" });
  assert.match(bad.error ?? "", /service_timing_period/i);
});

test("legacy rows still format via urgency fallback", () => {
  const label = formatServiceTimingDisplay({
    urgency: "specific_date",
    desired_date: "2026-08-18",
  }, "ru");
  assert.match(label, /2026|18/);
});

test("telegram payload includes human when label", () => {
  const payload = buildOwnerTelegramTimingPayload({
    locale: "ru",
    urgency: "asap",
    desired_date: null,
    service_timing: {
      service_timing_type: "asap",
      service_timing_date: null,
      service_timing_time: null,
      service_timing_date_end: null,
      service_timing_period: null,
      service_timing_note: null,
    },
  });
  assert.match(payload.when_label ?? "", /скорее/i);
});
