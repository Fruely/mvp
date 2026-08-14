import { cache } from "react";
import { headers } from "next/headers";

export type DashboardPerfMark = {
  label: string;
  durationMs: number;
};

type PerfStore = {
  marks: DashboardPerfMark[];
};

const getPerfStore = cache((): PerfStore => ({ marks: [] }));

/** Enabled via env or dev cookie (middleware sets x-freuly-dev-perf). No PII logged. */
export function isDashboardPerfEnabled(): boolean {
  if (process.env.DASHBOARD_PERF_TIMING === "1") return true;
  try {
    return headers().get("x-freuly-dev-perf") === "1";
  } catch {
    return false;
  }
}

export function recordDashboardPerfMark(label: string, durationMs: number): void {
  if (!isDashboardPerfEnabled()) return;
  getPerfStore().marks.push({
    label,
    durationMs: Math.max(0, Math.round(durationMs)),
  });
}

export async function measureDashboardPerf<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!isDashboardPerfEnabled()) return fn();
  const start = performance.now();
  try {
    return await fn();
  } finally {
    recordDashboardPerfMark(label, performance.now() - start);
  }
}

export function getDashboardPerfMarks(): DashboardPerfMark[] {
  if (!isDashboardPerfEnabled()) return [];
  return getPerfStore().marks;
}

export function summarizeDashboardPerfMarks(marks: DashboardPerfMark[]): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const mark of marks) {
    summary[mark.label] = (summary[mark.label] ?? 0) + mark.durationMs;
  }
  return summary;
}
