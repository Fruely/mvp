"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatServiceTimingDisplay } from "@/lib/serviceRequests/serviceTiming";
import { SERVICE_REQUEST_STATUSES } from "@/lib/serviceRequests/constants";
import type { ServiceRequestDetail, ServiceRequestListItem } from "@/lib/serviceRequests/adminData";
import type { ServiceRequestPromotionAdmin } from "@/lib/serviceRequests/promotionAdminData";
import { updateServiceRequestStatusAction } from "./actions";
import ServiceRequestPromotionBlock from "./ServiceRequestPromotionBlock";

type Props = {
  rows: ServiceRequestListItem[];
  detail: ServiceRequestDetail | null;
  promotion: ServiceRequestPromotionAdmin | null;
  selectedId: string | null;
};

export default function ServiceRequestsAdminView({
  rows,
  detail,
  promotion,
  selectedId,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openDetail(id: string) {
    router.push(`/admin/service-requests?id=${encodeURIComponent(id)}`);
  }

  function handleStatusChange(id: string, status: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateServiceRequestStatusAction(id, status);
      if (!result.ok) {
        setError("Не удалось обновить статус.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Заявки клиентов</h1>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="text-sm text-blue-700 hover:underline"
        >
          Обновить
        </button>
      </div>

      {error ? <p className="text-red-600 mb-4 text-sm">{error}</p> : null}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="overflow-x-auto border rounded-lg bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">Public ID</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-t cursor-pointer hover:bg-gray-50 ${selectedId === row.id ? "bg-blue-50" : ""}`}
                  onClick={() => openDetail(row.id)}
                >
                  <td className="px-3 py-2 font-mono text-xs">{row.public_id}</td>
                  <td className="px-3 py-2">
                    {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2">{row.category_text || "—"}</td>
                  <td className="px-3 py-2">{row.status || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border rounded-lg bg-white p-4 min-h-[240px]">
          {!detail ? (
            <p className="text-gray-500 text-sm">Выберите запрос в списке.</p>
          ) : (
            <div className="space-y-3 text-sm">
              <h2 className="font-semibold text-lg">{detail.public_id}</h2>
              <p><strong>Имя:</strong> {detail.client_name}</p>
              <p><strong>Email:</strong> {detail.client_email || "—"}</p>
              <p><strong>Телефон:</strong> {detail.client_phone || "—"}</p>
              <p><strong>Описание:</strong></p>
              <p className="whitespace-pre-wrap text-gray-700">{detail.description}</p>
              <p className="rounded-md bg-amber-50 px-3 py-2">
                <strong>Когда:</strong>{" "}
                {formatServiceTimingDisplay(detail, "ru")}
              </p>
              <p><strong>Work format:</strong> {detail.work_format}</p>
              <p><strong>Язык:</strong> {detail.preferred_language || "—"}</p>
              <p><strong>Город / PLZ:</strong> {[detail.postal_code, detail.city].filter(Boolean).join(" ") || "—"}</p>
              <p>
                <strong>Source:</strong> {detail.source}{" "}
                {detail.source_path ? `(${detail.source_path})` : ""}
              </p>
              <label className="block pt-2">
                <span className="font-medium">Status</span>
                <select
                  className="mt-1 block w-full border rounded px-2 py-1"
                  value={detail.status || "new"}
                  disabled={isPending}
                  onChange={(e) => handleStatusChange(detail.id, e.target.value)}
                >
                  {SERVICE_REQUEST_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>

              <ServiceRequestPromotionBlock
                serviceRequestId={detail.id}
                initialPromotion={promotion}
                defaultLocale={detail.locale || "ru"}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
