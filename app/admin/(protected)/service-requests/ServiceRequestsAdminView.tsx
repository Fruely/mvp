"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatServiceTimingDisplay } from "@/lib/serviceRequests/serviceTiming";
import { SERVICE_REQUEST_STATUSES } from "@/lib/serviceRequests/constants";
import type { ServiceRequestDetail, ServiceRequestListItem } from "@/lib/serviceRequests/adminData";
import type { ServiceRequestPromotionAdmin } from "@/lib/serviceRequests/promotionAdminData";
import { updateServiceRequestStatusAction } from "./actions";
import ServiceRequestPromotionBlock from "./ServiceRequestPromotionBlock";
import DemandIntelligenceBlock from "./DemandIntelligenceBlock";

type Props = {
  rows: ServiceRequestListItem[];
  detail: ServiceRequestDetail | null;
  promotion: ServiceRequestPromotionAdmin | null;
  selectedId: string | null;
};

function acquisitionChannel(detail: ServiceRequestDetail): string | null {
  return detail.campaign_attribution?.source ?? detail.acquisition_source ?? null;
}

function acquisitionCampaign(detail: ServiceRequestDetail): string | null {
  return detail.campaign_attribution?.campaign_code ?? detail.acquisition_campaign ?? null;
}

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
        <div>
          <h1 className="text-2xl font-bold">Service requests</h1>
          <p className="text-sm text-gray-500 mt-1">Заявки, источник спроса, fulfillment и привлечение специалистов.</p>
        </div>
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
        <div className="overflow-x-auto border rounded-lg bg-white self-start">
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
            <div className="space-y-4 text-sm">
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

              <div className="rounded-md border border-blue-100 bg-blue-50/60 px-3 py-3 space-y-1">
                <p className="font-semibold text-gray-900">Канал лида / attribution</p>
                <p><strong>Канал:</strong> {acquisitionChannel(detail) || "Не определён"}</p>
                {detail.acquisition_medium ? <p><strong>Medium:</strong> {detail.acquisition_medium}</p> : null}
                {acquisitionCampaign(detail) ? <p><strong>Campaign:</strong> {acquisitionCampaign(detail)}</p> : null}
                {detail.acquisition_content ? <p><strong>Content:</strong> {detail.acquisition_content}</p> : null}
                {detail.acquisition_term ? <p><strong>Term / keyword:</strong> {detail.acquisition_term}</p> : null}
                {detail.acquisition_gclid ? <p className="break-all"><strong>Google click ID:</strong> {detail.acquisition_gclid}</p> : null}
                {detail.acquisition_fbclid ? <p className="break-all"><strong>Meta click ID:</strong> {detail.acquisition_fbclid}</p> : null}
                {detail.campaign_attribution ? (
                  <p><strong>Campaign link:</strong> {detail.campaign_attribution.name} (/go/{detail.campaign_attribution.slug})</p>
                ) : null}
                {detail.acquisition_landing_path ? <p className="break-all"><strong>Первый вход:</strong> {detail.acquisition_landing_path}</p> : null}
                {detail.acquisition_referrer ? <p className="break-all"><strong>Referrer:</strong> {detail.acquisition_referrer}</p> : null}
                {detail.acquisition_captured_at ? <p><strong>First-touch captured:</strong> {new Date(detail.acquisition_captured_at).toLocaleString()}</p> : null}
                {!detail.acquisition_source && !detail.campaign_attribution ? (
                  <p className="text-xs text-gray-500">Для старых заявок или при отсутствии согласия на аналитику канал может быть неизвестен.</p>
                ) : null}
              </div>

              <p>
                <strong>Внутренний путь:</strong> {detail.source}{" "}
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
                  {SERVICE_REQUEST_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>

              <DemandIntelligenceBlock key={detail.id} detail={detail} />

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
