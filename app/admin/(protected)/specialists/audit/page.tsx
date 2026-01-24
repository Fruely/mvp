import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LogEntry = {
  id?: string;
  specialist_id: string;
  status: string;
  reason: string | null;
  decided_by: string | null;
  created_at: string;
};

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

export default async function SpecialistAuditPage() {
  const supabase = createSupabaseServerClient();
  const { data: rows, error } = await supabase
    .from("specialist_moderation_log")
    .select("specialist_id, status, reason, decided_by, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const logs = (error ? [] : rows ?? []) as LogEntry[];

  return (
    <div className="px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Moderation history
            </h1>
            <p className="text-sm text-gray-600">
              Read-only audit log of specialist moderation decisions
            </p>
          </div>
          <Link
            href="/admin/specialists"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Specialists
          </Link>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-700">
                <th className="px-3 py-2 border-b">Date</th>
                <th className="px-3 py-2 border-b">Specialist ID</th>
                <th className="px-3 py-2 border-b">Status</th>
                <th className="px-3 py-2 border-b">Reason</th>
                <th className="px-3 py-2 border-b">Decided by</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td
                    className="px-3 py-8 text-center text-gray-500"
                    colSpan={5}
                  >
                    No moderation history yet.
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => (
                  <tr key={log.created_at + log.specialist_id + idx} className="align-top">
                    <td className="whitespace-nowrap border-b px-3 py-2 text-gray-900">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="border-b px-3 py-2 font-mono text-gray-700">
                      {log.specialist_id || "—"}
                    </td>
                    <td className="border-b px-3 py-2">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                          log.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="max-w-xs border-b px-3 py-2 text-gray-600 whitespace-pre-wrap break-words">
                      {log.reason?.trim() || "—"}
                    </td>
                    <td className="border-b px-3 py-2 text-gray-600">
                      {log.decided_by || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
