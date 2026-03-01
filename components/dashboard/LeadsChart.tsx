import type { DailyLeadPoint } from "@/lib/dashboard/getDashboardData";

function formatAxisLabel(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

export default function LeadsChart({ data }: { data: DailyLeadPoint[] }) {
  const maxCount = data.reduce((max, item) => Math.max(max, item.count), 0);
  const hasAnyData = data.some((item) => item.count > 0);

  const first = data[0]?.date ?? "";
  const middle = data[Math.floor(data.length / 2)]?.date ?? "";
  const last = data[data.length - 1]?.date ?? "";

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Активность заявок</h2>
      <p className="mt-1 text-sm text-gray-500">Динамика обращений за последние 30 дней.</p>

      <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
        <div className="flex h-36 items-end gap-1">
          {data.map((point) => {
            const percent = maxCount > 0 ? (point.count / maxCount) * 100 : 0;
            const height = point.count > 0 ? Math.max(8, percent) : 4;
            return (
              <div
                key={point.date}
                className="flex-1 rounded-sm bg-blue-500/80"
                style={{ height: `${height}%` }}
                title={`${point.date}: ${point.count}`}
                aria-label={`${point.date}: ${point.count}`}
              />
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>{formatAxisLabel(first)}</span>
          <span>{formatAxisLabel(middle)}</span>
          <span>{formatAxisLabel(last)}</span>
        </div>
      </div>

      {!hasAnyData ? (
        <p className="mt-3 text-sm text-gray-500">Нет данных за период</p>
      ) : null}
    </section>
  );
}

