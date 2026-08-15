import type { NewServiceRequestOwnerPayload } from "./ownerTelegramMessage";
import { formatServiceTimingDisplay } from "./serviceTiming";

export function buildOwnerTelegramTimingPayload(
  validated: {
    locale: string;
    service_timing: {
      service_timing_type: string;
      service_timing_date: string | null;
      service_timing_time: string | null;
      service_timing_date_end: string | null;
      service_timing_period: string | null;
      service_timing_note: string | null;
    };
    urgency: string;
    desired_date: string | null;
  },
): Pick<NewServiceRequestOwnerPayload, "when_label" | "urgency"> {
  const locale =
    validated.locale === "de" || validated.locale === "ua" || validated.locale === "ru"
      ? validated.locale
      : "ru";
  return {
    when_label: formatServiceTimingDisplay(
      {
        ...validated.service_timing,
        urgency: validated.urgency,
        desired_date: validated.desired_date,
      },
      locale,
    ),
    urgency: validated.urgency,
  };
}
