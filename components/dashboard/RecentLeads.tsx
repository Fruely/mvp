import type { DashboardLead } from "@/lib/dashboard/getDashboardData";

function statusStyles(status: string | null): string {
  if (status === "new") return "bg-blue-50 text-blue-700";
  if (status === "contacted") return "bg-violet-50 text-violet-700";
  if (status === "closed") return "bg-emerald-50 text-emerald-700";
  return "bg-gray-100 text-gray-700";
}

export default function RecentLeads({
  leads,
  contactsLocked,
}: {
  leads: DashboardLead[];
  contactsLocked: boolean;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Последние заявки</h2>
        <p className="mt-1 text-sm text-gray-500">5 последних обращений за период.</p>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
          Пока нет заявок
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-2 py-2 font-medium">Клиент</th>
                <th className="px-2 py-2 font-medium">Дата</th>
                <th className="px-2 py-2 font-medium">Статус</th>
                <th className="px-2 py-2 font-medium">Контакты</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const clientName = lead.client_name?.trim() || "—";
                const dateLabel = lead.created_at
                  ? new Date(lead.created_at).toLocaleDateString("ru-RU")
                  : "—";
                const contactLabel = contactsLocked
                  ? "🔒 Скрыто"
                  : lead.client_email?.trim() || lead.client_phone?.trim() || "—";

                return (
                  <tr key={lead.id} className="border-b border-gray-50 last:border-b-0">
                    <td className="px-2 py-3 text-gray-800">{clientName}</td>
                    <td className="px-2 py-3 text-gray-600">{dateLabel}</td>
                    <td className="px-2 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles(lead.status)}`}>
                        {lead.status || "—"}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-gray-700">{contactLabel}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

