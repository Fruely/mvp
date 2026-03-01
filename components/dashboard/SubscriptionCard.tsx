function getStatusClass(status: string): string {
  if (status === "early_access") return "bg-emerald-50 text-emerald-700";
  if (status === "active") return "bg-blue-50 text-blue-700";
  if (status === "grace") return "bg-amber-50 text-amber-700";
  if (status === "expired") return "bg-rose-50 text-rose-700";
  return "bg-gray-100 text-gray-700";
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ru-RU");
}

export default function SubscriptionCard({
  status,
  planName,
  subscriptionUntil,
  graceUntil,
}: {
  status: string;
  planName: string;
  subscriptionUntil: string | null;
  graceUntil: string | null;
}) {
  const ctaLabel =
    status === "expired"
      ? "Активировать тариф"
      : status === "grace"
        ? "Продлить сейчас"
        : "Управление подпиской";

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Подписка</h2>
      <p className="mt-1 text-sm text-gray-500">Состояние доступа к контактам и заявкам.</p>

      <div className="mt-4 space-y-2 text-sm text-gray-700">
        <div className="flex items-center justify-between gap-3">
          <span>Статус</span>
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(status)}`}>
            {status}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Тариф</span>
          <span className="font-medium text-gray-900">{planName}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Действует до</span>
          <span>{formatDate(subscriptionUntil)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Grace до</span>
          <span>{formatDate(graceUntil)}</span>
        </div>
      </div>

      <button
        type="button"
        className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        {ctaLabel}
      </button>
    </section>
  );
}

