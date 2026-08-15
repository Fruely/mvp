"use client";

import { useCallback, useEffect, useState } from "react";
import { buildAdminMarkPaidBody } from "@/lib/partners/partnerDashboardUi";
import AdminReferralLinkActions from "@/components/admin/AdminReferralLinkActions";
import { formatPayoutStatusRu } from "@/lib/admin/partnerAdminUi";

type AdminPayoutRow = {
  id: string;
  partner_name: string;
  partner_referral_code: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  requested_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  payment_reference: string | null;
  admin_note: string | null;
};

function adminHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? window.localStorage.getItem("ADMIN_API_TOKEN") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { "x-admin-token": token } : {}),
  };
}

function formatEur(cents: number, currency: string): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: currency || "EUR",
  }).format(cents / 100);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ru-RU");
  } catch {
    return iso;
  }
}

export default function AdminPartnerPayoutQueue({
  onMessage,
}: {
  onMessage: (msg: string | null) => void;
}) {
  const [payouts, setPayouts] = useState<AdminPayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [paidModal, setPaidModal] = useState<AdminPayoutRow | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/partners/payouts", {
        headers: adminHeaders(),
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        onMessage(`Не удалось загрузить выплаты: ${json.error || res.status}`);
        setPayouts([]);
        return;
      }
      setPayouts(json.payouts ?? []);
    } catch {
      onMessage("Не удалось загрузить выплаты");
      setPayouts([]);
    } finally {
      setLoading(false);
    }
  }, [onMessage]);

  useEffect(() => {
    void load();
  }, [load]);

  async function postAction(payoutId: string, action: "ready" | "paid" | "cancel", body?: object) {
    setBusyId(payoutId);
    onMessage(null);
    try {
      const res = await fetch(`/api/admin/partners/payouts/${payoutId}/${action}`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify(body ?? {}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        onMessage(`Ошибка: ${json.error || res.status}`);
        return;
      }
      onMessage(action === "paid" ? "Выплата отмечена как выполненная" : "Статус выплаты обновлён");
      setPaidModal(null);
      setPaymentReference("");
      setAdminNote("");
      await load();
    } catch {
      onMessage("Не удалось обновить выплату");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Выплаты партнёрам</h2>
        <p className="mt-1 text-sm text-gray-600">
          Здесь находятся выплаты, готовые к переводу. Банковский перевод выполняется вне Freuly —
          после фактического перевода отметьте выплату как выполненную.
        </p>
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Не отмечайте выплату выполненной до фактического банковского перевода.
        </p>
        <button
          type="button"
          className="mt-2 text-xs font-medium text-indigo-600 hover:underline"
          onClick={() => setShowDetails((v) => !v)}
        >
          {showDetails ? "Скрыть подробности" : "Как работать с выплатами?"}
        </button>
        {showDetails ? (
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-gray-600">
            <li>Партнёр запрашивает выплату — заявка появляется в таблице.</li>
            <li>Проверьте сумму и партнёра.</li>
            <li>Выполните перевод в банке (SEPA) на реквизиты партнёра.</li>
            <li>Только после перевода нажмите «Отметить выплаченным».</li>
            <li>
              Если платёж клиента был возвращён, связанная комиссия может быть отменена — не
              переводите такие суммы.
            </li>
          </ol>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Загрузка выплат…</p>
      ) : payouts.length === 0 ? (
        <p className="text-sm text-gray-500">Заявок на выплату пока нет.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-2 py-2">Партнёр</th>
                <th className="px-2 py-2">Сумма</th>
                <th className="px-2 py-2">Запрошено</th>
                <th className="px-2 py-2">Статус</th>
                <th className="px-2 py-2">Ссылка на платёж</th>
                <th className="px-2 py-2">Действия</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-b last:border-0 align-top">
                  <td className="px-2 py-2">
                    <div className="font-medium text-gray-900">{p.partner_name}</div>
                    {p.partner_referral_code ? (
                      <div className="mt-1">
                        <AdminReferralLinkActions
                          referralCode={p.partner_referral_code}
                          compact
                        />
                      </div>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {formatEur(p.amount_cents, p.currency)}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-600 whitespace-nowrap">
                    {formatDate(p.requested_at)}
                  </td>
                  <td className="px-2 py-2">{formatPayoutStatusRu(p.status)}</td>
                  <td className="px-2 py-2 text-xs font-mono text-gray-600">
                    {p.payment_reference || "—"}
                    {p.paid_at ? (
                      <div className="mt-1 text-gray-500">Выплачено {formatDate(p.paid_at)}</div>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 space-x-1 whitespace-nowrap">
                    {p.status === "draft" ? (
                      <>
                        <button
                          type="button"
                          disabled={busyId === p.id}
                          className="text-xs font-semibold text-indigo-600 disabled:opacity-50"
                          onClick={() => void postAction(p.id, "ready")}
                        >
                          Готова к переводу
                        </button>
                        <button
                          type="button"
                          disabled={busyId === p.id}
                          className="text-xs font-semibold text-red-600 disabled:opacity-50"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Отменить эту выплату? Связанная комиссия снова станет доступной, если она ещё одобрена."
                              )
                            ) {
                              void postAction(p.id, "cancel");
                            }
                          }}
                        >
                          Отменить
                        </button>
                      </>
                    ) : null}
                    {p.status === "ready" ? (
                      <>
                        <button
                          type="button"
                          disabled={busyId === p.id}
                          className="text-xs font-semibold text-emerald-700 disabled:opacity-50"
                          onClick={() => {
                            setPaidModal(p);
                            setPaymentReference("");
                            setAdminNote("");
                          }}
                        >
                          Отметить выплаченным
                        </button>
                        <button
                          type="button"
                          disabled={busyId === p.id}
                          className="text-xs font-semibold text-red-600 disabled:opacity-50"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Отменить эту выплату? Связанная комиссия снова станет доступной, если она ещё одобрена."
                              )
                            ) {
                              void postAction(p.id, "cancel");
                            }
                          }}
                        >
                          Отменить
                        </button>
                      </>
                    ) : null}
                    {p.status === "paid" || p.status === "cancelled" ? (
                      <span className="text-xs text-gray-400">—</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {paidModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Подтвердить банковский перевод</h3>
            <p className="mt-2 text-sm text-gray-600">
              Подтверждайте только после фактического перевода. Freuly не отправляет деньги с этого
              экрана.
            </p>
            <p className="mt-2 text-sm font-medium text-gray-900">
              {formatEur(paidModal.amount_cents, paidModal.currency)} · {paidModal.partner_name}
            </p>
            <label className="mt-4 block text-sm">
              Ссылка на платёж / референс (необязательно)
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                disabled={busyId === paidModal.id}
              />
            </label>
            <label className="mt-3 block text-sm">
              Комментарий администратора (необязательно)
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                disabled={busyId === paidModal.id}
              />
            </label>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={busyId === paidModal.id}
                className="flex-1 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                onClick={() =>
                  void postAction(
                    paidModal.id,
                    "paid",
                    buildAdminMarkPaidBody({
                      paymentReference,
                      adminNote,
                    })
                  )
                }
              >
                {busyId === paidModal.id ? "Сохранение…" : "Отметить выплаченным"}
              </button>
              <button
                type="button"
                disabled={busyId === paidModal.id}
                className="rounded-lg border px-3 py-2 text-sm"
                onClick={() => setPaidModal(null)}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
