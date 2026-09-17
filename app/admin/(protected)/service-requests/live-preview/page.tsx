import Link from "next/link";
import LiveRequestDrum, { type RecentRequest } from "@/components/home/LiveRequestDrum";

export const dynamic = "force-dynamic";

function previewItems(): RecentRequest[] {
  const now = Date.now();

  return [
    {
      id: "preview-psychologist",
      title: "Психолог",
      summary: "Нужна помощь подростку с тревожностью",
      created_at: new Date(now - 18 * 60_000).toISOString(),
      preferred_language: "ru",
      work_format: "online",
      city: null,
      postal_code: null,
    },
    {
      id: "preview-it",
      title: "IT-помощь",
      summary: "Не работает домашняя сеть",
      created_at: new Date(now - 43 * 60_000).toISOString(),
      preferred_language: "de",
      work_format: "offline",
      city: "Siegen",
      postal_code: null,
    },
    {
      id: "preview-tax",
      title: "Налоговая консультация",
      summary: "Нужна помощь со Steuererklärung",
      created_at: new Date(now - 4 * 60 * 60_000).toISOString(),
      preferred_language: "ua",
      work_format: "online",
      city: null,
      postal_code: null,
    },
  ];
}

export default function LiveRequestDrumPreviewPage() {
  return (
    <div className="p-8">
      <div className="mx-auto mb-6 flex max-w-5xl items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Предпросмотр барабана заявок</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            Ниже показан тот же компонент, что стоит на главной. Эти три карточки существуют
            только в закрытом предпросмотре и никогда не попадают в публичную ленту.
          </p>
        </div>
        <Link
          href="/admin/service-requests"
          className="shrink-0 text-sm font-medium text-blue-700 hover:underline"
        >
          Вернуться к заявкам
        </Link>
      </div>

      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <LiveRequestDrum lang="ru" previewItems={previewItems()} />
      </div>
    </div>
  );
}
