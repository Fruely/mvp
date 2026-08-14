import {
  getDashboardPerfMarks,
  isDashboardPerfEnabled,
  summarizeDashboardPerfMarks,
} from "@/lib/dashboard/requestPerf";

/** Dev-only probe: exposes stage durations via data attribute (no PII). */
export default function DashboardPerfProbe({ route }: { route: string }) {
  if (!isDashboardPerfEnabled()) return null;

  const marks = getDashboardPerfMarks();
  const summary = summarizeDashboardPerfMarks(marks);
  const totalMs = Object.values(summary).reduce((sum, value) => sum + value, 0);

  const payload = JSON.stringify({
    route,
    stages: summary,
    totalMs,
  });

  return (
    <div
      id="dashboard-perf-probe"
      hidden
      data-dashboard-perf={payload}
      aria-hidden="true"
    />
  );
}
