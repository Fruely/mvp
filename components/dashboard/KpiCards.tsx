type KpiCardsProps = {
  newCount: number;
  contactedCount: number;
  closedCount: number;
  totalLast30Days: number;
};

export default function KpiCards({
  newCount,
  contactedCount,
  closedCount,
  totalLast30Days,
}: KpiCardsProps) {
  const estimatedRevenue = totalLast30Days * 80;

  const cards = [
    {
      key: "new",
      title: "Новые заявки",
      value: String(newCount),
      subtitle: "за 30 дней",
      valueClass: "text-blue-600",
    },
    {
      key: "contacted",
      title: "В работе",
      value: String(contactedCount),
      subtitle: "статус contacted",
      valueClass: "text-violet-600",
    },
    {
      key: "closed",
      title: "Завершено",
      value: String(closedCount),
      subtitle: "статус closed",
      valueClass: "text-emerald-600",
    },
    {
      key: "revenue",
      title: "Потенциальный доход",
      value: `≈ €${estimatedRevenue}`,
      subtitle: "оценка (mock)",
      valueClass: "text-gray-900",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.key}
          className="h-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <p className="text-sm font-medium text-gray-600">{card.title}</p>
          <p className={`mt-3 text-3xl font-semibold ${card.valueClass}`}>{card.value}</p>
          <p className="mt-1 text-xs text-gray-500">{card.subtitle}</p>
        </article>
      ))}
    </section>
  );
}

