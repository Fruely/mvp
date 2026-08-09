"use client";

import { useCallback, useEffect, useState } from "react";
import { buildAdminMarkPaidBody } from "@/lib/partners/partnerDashboardUi";

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
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: currency || "EUR",
  }).format(cents / 100);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("de-DE");
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/partners/payouts", {
        headers: adminHeaders(),
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        onMessage(`Payout queue failed: ${json.error || res.status}`);
        setPayouts([]);
        return;
      }
      setPayouts(json.payouts ?? []);
    } catch {
      onMessage("Payout queue failed");
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
        onMessage(`Payout ${action} failed: ${json.error || res.status}`);
        return;
      }
      onMessage(`Payout ${action} succeeded`);
      setPaidModal(null);
      setPaymentReference("");
      setAdminNote("");
      await load();
    } catch {
      onMessage(`Payout ${action} failed`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Manual payout queue</h2>
        <p className="mt-1 text-xs text-gray-500">
          Bank transfers are executed outside Freuly. Mark paid only after the SEPA transfer
          completed.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading payouts…</p>
      ) : payouts.length === 0 ? (
        <p className="text-sm text-gray-500">No payout requests yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-2 py-2">Partner</th>
                <th className="px-2 py-2">Amount</th>
                <th className="px-2 py-2">Requested</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Reference</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-b last:border-0 align-top">
                  <td className="px-2 py-2">
                    <div className="font-medium text-gray-900">{p.partner_name}</div>
                    {p.partner_referral_code ? (
                      <div className="text-xs text-gray-500">/r/{p.partner_referral_code}</div>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {formatEur(p.amount_cents, p.currency)}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-600 whitespace-nowrap">
                    {formatDate(p.requested_at)}
                  </td>
                  <td className="px-2 py-2 capitalize">{p.status}</td>
                  <td className="px-2 py-2 text-xs font-mono text-gray-600">
                    {p.payment_reference || "—"}
                    {p.paid_at ? (
                      <div className="mt-1 text-gray-500">Paid {formatDate(p.paid_at)}</div>
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
                          Mark ready
                        </button>
                        <button
                          type="button"
                          disabled={busyId === p.id}
                          className="text-xs font-semibold text-red-600 disabled:opacity-50"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Cancel this payout? Linked commission becomes available again if still approved."
                              )
                            ) {
                              void postAction(p.id, "cancel");
                            }
                          }}
                        >
                          Cancel
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
                          Mark paid
                        </button>
                        <button
                          type="button"
                          disabled={busyId === p.id}
                          className="text-xs font-semibold text-red-600 disabled:opacity-50"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Cancel this payout? Linked commission becomes available again if still approved."
                              )
                            ) {
                              void postAction(p.id, "cancel");
                            }
                          }}
                        >
                          Cancel
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
            <h3 className="text-lg font-semibold text-gray-900">Confirm bank transfer paid</h3>
            <p className="mt-2 text-sm text-gray-600">
              Confirm only after the actual bank transfer was completed. Freuly does not send
              money from this screen.
            </p>
            <p className="mt-2 text-sm font-medium text-gray-900">
              {formatEur(paidModal.amount_cents, paidModal.currency)} · {paidModal.partner_name}
            </p>
            <label className="mt-4 block text-sm">
              Payment reference (optional)
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                disabled={busyId === paidModal.id}
              />
            </label>
            <label className="mt-3 block text-sm">
              Admin note (optional)
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
                {busyId === paidModal.id ? "Saving…" : "Mark paid"}
              </button>
              <button
                type="button"
                disabled={busyId === paidModal.id}
                className="rounded-lg border px-3 py-2 text-sm"
                onClick={() => setPaidModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
