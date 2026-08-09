"use client";

import { useCallback, useEffect, useState } from "react";
import AdminPartnerPayoutQueue from "@/components/admin/AdminPartnerPayoutQueue";

type PartnerListItem = {
  id: string;
  name: string;
  email: string;
  referral_code: string;
  status: string;
  commission_amount_cents: number;
  currency: string;
  summary: {
    clicks: number;
    registrations: number;
    approved_commissions: number;
    total_approved_cents: number;
    paid_cents: number;
  };
};

function adminHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? window.localStorage.getItem("ADMIN_API_TOKEN") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { "x-admin-token": token } : {}),
  };
}

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<PartnerListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    email: "",
    referral_code: "",
    commission_amount_cents: 2900,
  });
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/partners", { headers: adminHeaders(), cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Failed to load partners");
        setPartners([]);
        return;
      }
      setPartners(json.partners ?? []);
    } catch {
      setError("Failed to load partners");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createPartner(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch("/api/admin/partners", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({
        ...form,
        status: "active",
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(`Create failed: ${json.error || res.status}`);
      return;
    }
    setMessage(`Created partner ${json.partner?.referral_code} → /r/${json.partner?.referral_code}`);
    setForm({ name: "", email: "", referral_code: "", commission_amount_cents: 2900 });
    await load();
  }

  async function setStatus(id: string, status: string) {
    setMessage(null);
    const res = await fetch(`/api/admin/partners/${id}`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify({ status }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(`Status failed: ${json.error || res.status}`);
      return;
    }
    await load();
  }

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Partners</h1>
        <p className="mt-1 text-sm text-gray-600">
          Referral program admin: partner lifecycle, manual payout queue, commission reversals.
          Commissions are created automatically from the first eligible Stripe invoice.paid event;
          rewards use actual payment economics (gross − VAT − fee), not catalog list prices.
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <AdminPartnerPayoutQueue onMessage={setMessage} />

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Create partner</h2>
        <p className="mt-1 text-xs text-gray-500">
          Legacy rate field is stored for admin reference only; live commission amounts come from
          Stripe invoice facts at first payment.
        </p>
        <form onSubmit={createPartner} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <input
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
          <input
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder="Referral code"
            value={form.referral_code}
            onChange={(e) => setForm((f) => ({ ...f, referral_code: e.target.value }))}
            required
          />
          <input
            className="rounded-lg border px-3 py-2 text-sm"
            type="number"
            min={1}
            placeholder="Legacy rate cents (admin metadata)"
            value={form.commission_amount_cents}
            onChange={(e) =>
              setForm((f) => ({ ...f, commission_amount_cents: Number(e.target.value) }))
            }
            required
          />
          <button
            type="submit"
            className="sm:col-span-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Create active partner
          </button>
        </form>
      </section>

      <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Partner</th>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Clicks</th>
              <th className="px-3 py-2">Regs</th>
              <th className="px-3 py-2">Approved €</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={7}>
                  Loading…
                </td>
              </tr>
            ) : partners.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={7}>
                  No partners yet.
                </td>
              </tr>
            ) : (
              partners.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.email}</div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    /r/{p.referral_code}
                  </td>
                  <td className="px-3 py-2">{p.status}</td>
                  <td className="px-3 py-2">{p.summary.clicks}</td>
                  <td className="px-3 py-2">{p.summary.registrations}</td>
                  <td className="px-3 py-2">
                    {(p.summary.total_approved_cents / 100).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 space-x-2">
                    <button
                      type="button"
                      className="text-xs font-semibold text-indigo-600"
                      onClick={() => void setStatus(p.id, "active")}
                    >
                      Activate
                    </button>
                    <button
                      type="button"
                      className="text-xs font-semibold text-amber-700"
                      onClick={() => void setStatus(p.id, "paused")}
                    >
                      Pause
                    </button>
                    <button
                      type="button"
                      className="text-xs font-semibold text-red-600"
                      onClick={() => void setStatus(p.id, "disabled")}
                    >
                      Disable
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
