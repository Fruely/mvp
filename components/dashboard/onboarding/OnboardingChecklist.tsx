export type OnboardingChecklistItem = {
  key: string;
  label: string;
  done: boolean;
  helper?: string;
  recommendation?: boolean;
};

export default function OnboardingChecklist({
  title,
  publishReadyLabel,
  recommendationLabel,
  items,
}: {
  title: string;
  publishReadyLabel: string;
  recommendationLabel: string;
  items: OnboardingChecklistItem[];
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-3"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
              {item.helper ? <p className="mt-1 text-xs text-gray-500">{item.helper}</p> : null}
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                item.done
                  ? "bg-emerald-50 text-emerald-700"
                  : item.recommendation
                    ? "bg-amber-50 text-amber-700"
                    : "bg-gray-100 text-gray-700"
              }`}
            >
              {item.done ? publishReadyLabel : item.recommendation ? recommendationLabel : "—"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
