"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const TOKEN_STORAGE_KEY = "ADMIN_API_TOKEN";

type FunnelStage = {
  key: string;
  label: string;
  count: number;
  conversionFromStart: number;
  conversionFromPrevious: number;
  dropFromPrevious: number;
};

type FunnelEvent = {
  id: string;
  specialistId: string;
  specialistName: string | null;
  specialistEmail: string | null;
  eventType: string;
  eventLabel: string;
  occurredAt: string | null;
  source: string | null;
  historical: boolean;
  approximate: boolean;
};

type AdminStats = {
  totalLeads: number;
  recentLeads: number;
  approvedSpecialists: number;
  pendingSpecialists: number;
  activeSubscriptions: number;
  specialistFunnel?: {
    days: number | null;
    since: string | null;
    stages: FunnelStage[];
  };
};

const PERIODS = [
  { value: "7", label: "7 дней" },
  { value: "30", label: "30 дней" },
  { value: "90", label: "90 дней" },
  { value: "all", label: "Всё время" },
] as const;

function formatEventTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(date);
}

export default function AdminDashboardPage() {
  const [hasToken, setHasToken] = useState(false);
  const [token, setToken] = useState("");
  const [period, setPeriod] = useState("30");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [events, setEvents] = useState<FunnelEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(TOKEN_STORAGE_KEY)?.trim() ?? "";
      setToken(saved);
      setHasToken(saved.length > 0);
    } catch {
      setHasToken(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const headers = { "x-admin-token": token };
      const [statsResponse, eventsResponse] = await Promise.all([
        fetch(`/api/admin/stats?days=${encodeURIComponent(period)}`, {
          cache: "no-store",
          headers,
        }),
        fetch(`/api/admin/funnel-events?days=${encodeURIComponent(period)}`, {
          cache: "no-store",
          headers,
        }),
      ]);

      if (!statsResponse.ok) throw new Error(`Stats HTTP ${statsResponse.status}`);
      if (!eventsResponse.ok) throw new Error(`Events HTTP ${eventsResponse.status}`);

      const statsPayload = (await statsResponse.json()) as AdminStats;
      const eventsPayload = (await eventsResponse.json()) as { events?: FunnelEvent[] };
      setStats(statsPayload);
      setEvents(Array.isArray(eventsPayload.events) ? eventsPayload.events : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить статистику");
    } finally {
      setLoading(false);
    }
  }, [period, token]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const stages = stats?.specialistFunnel?.stages ?? [];
  const maxCount = useMemo(() => Math.max(stages[0]?.count ?? 0, 1), [stages]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Операционная статистика и диагностика воронки специалистов.
          </p>
        </div>

        {!hasToken && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Для загрузки статистики нужен ADMIN_API_TOKEN. Остальные admin-разделы доступны по прямым ссылкам ниже.
          </div>
        )}

        {stats && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Все лиды", stats.totalLeads],
              ["Лиды за 7 дней", stats.recentLeads],
              ["Опубликованные", stats.approvedSpecialists],
              ["Draft", stats.pendingSpecialists],
              ["Активные тарифы", stats.activeSubscriptions],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
                <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
              </div>
            ))}
          </div>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Воронка специалистов</h2>
              <p className="text-sm text-gray-500">
                Уникальные специалисты на каждом этапе. Период формирует когорту по дате регистрации.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {PERIODS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setPeriod(item.value)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    period === item.value
                      ? "bg-gray-900 text-white"
                      : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {loading && <div className="py-10 text-center text-sm text-gray-500">Загрузка…</div>}
          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              Ошибка статистики: {error}.
            </div>
          )}

          {!loading && !error && stages.length > 0 && (
            <div className="mt-6 space-y-4">
              {stages.map((stage, index) => {
                const width = Math.max((stage.count / maxCount) * 100, stage.count > 0 ? 3 : 0);
                return (
                  <div key={stage.key} className="grid gap-2 md:grid-cols-[180px_1fr_240px] md:items-center">
                    <div>
                      <div className="font-medium text-gray-900">{stage.label}</div>
                      {index > 0 && (
                        <div className="text-xs text-gray-500">−{stage.dropFromPrevious} с прошлого шага</div>
                      )}
                    </div>
                    <div className="h-9 overflow-hidden rounded-lg bg-gray-100">
                      <div
                        className="flex h-full items-center justify-end rounded-lg bg-gray-900 px-3 text-sm font-semibold text-white transition-all"
                        style={{ width: `${width}%` }}
                      >
                        {stage.count > 0 ? stage.count : ""}
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600 md:justify-end">
                      <span><strong className="text-gray-900">{stage.conversionFromStart}%</strong> от старта</span>
                      {index > 0 && (
                        <span><strong className="text-gray-900">{stage.conversionFromPrevious}%</strong> шаг</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && !error && hasToken && stages.length === 0 && (
            <div className="py-10 text-center text-sm text-gray-500">Пока нет данных для выбранного периода.</div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">События специалистов</h2>
            <p className="mt-1 text-sm text-gray-500">
              Реальная лента событий за выбранный период. Исторические события восстановлены из уже существовавших полей базы.
            </p>
          </div>

          {!loading && !error && events.length > 0 && (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-3">Когда</th>
                    <th className="px-3 py-3">Специалист</th>
                    <th className="px-3 py-3">Событие</th>
                    <th className="px-3 py-3">Данные</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td className="whitespace-nowrap px-3 py-3 text-gray-600">
                        {formatEventTime(event.occurredAt)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-gray-900">{event.specialistName || "Без имени"}</div>
                        {event.specialistEmail && (
                          <div className="text-xs text-gray-500">{event.specialistEmail}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 font-medium text-gray-900">{event.eventLabel}</td>
                      <td className="px-3 py-3 text-xs text-gray-500">
                        {event.approximate
                          ? "восстановлено, время приблизительное"
                          : event.historical
                            ? "восстановлено из истории"
                            : "точное событие"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && hasToken && events.length === 0 && (
            <div className="py-10 text-center text-sm text-gray-500">Событий за выбранный период нет.</div>
          )}
        </section>

        <div className="grid gap-3 sm:grid-cols-3">
          <Link href="/admin/leads" className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50">
            <span className="font-medium text-gray-900">Leads</span>
            <span className="text-sm text-gray-500">/admin/leads</span>
          </Link>
          <Link href="/admin/specialists" className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50">
            <span className="font-medium text-gray-900">Specialists</span>
            <span className="text-sm text-gray-500">/admin/specialists</span>
          </Link>
          <Link href="/admin/telegram" className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50">
            <span className="font-medium text-gray-900">Telegram channel</span>
            <span className="text-sm text-gray-500">/admin/telegram</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
