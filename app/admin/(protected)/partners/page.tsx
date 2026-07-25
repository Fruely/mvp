"use client";

import { useCallback, useEffect, useState } from "react";

type PartnerListItem = {
  id: string;
  name: string;
  email: string;
  referral_code: string;
  status: string;
  commission_amount_cents: number;
  currency: string;
  user_id?: string | null;
  summary: {
    clicks: number;
    registrations: number;
    approved_commissions: number;
    total_approved_cents: number;
    paid_cents: number;
  };
};

type ApplicationItem = {
  id: string;
  name: string;
  email: string;
  channel_name: string;
  channel_url: string;
  platform: string | null;
  status: string;
  reject_reason: string | null;
  partner_id: string | null;
  created_at: string;
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
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    email: "",
    referral_code: "",
    commission_amount_cents: 2900,
  });
  const [confirmForm, setConfirmForm] = useState({
    specialist_id: "",
    external_payment_reference: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [lastInvite, setLastInvite] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [partnersRes, appsRes] = await Promise.all([
        fetch("/api/admin/partners", { headers: adminHeaders(), cache: "no-store" }),
        fetch("/api/admin/partners/applications?status=pending", {
          headers: adminHeaders(),
          cache: "no-store",
        }),
      ]);
      const partnersJson = await partnersRes.json().catch(() => ({}));
      const appsJson = await appsRes.json().catch(() => ({}));
      if (!partnersRes.ok) {
        setError(partnersJson.error || "Failed to load partners");
        setPartners([]);
      } else {
        setPartners(partnersJson.partners ?? []);
      }
      if (appsRes.ok) {
        setApplications(appsJson.applications ?? []);
      }
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

  async function confirmPayment(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch("/api/admin/partners/confirm-first-payment", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({
        specialistId: confirmForm.specialist_id,
        externalPaymentReference: confirmForm.external_payment_reference,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(`Confirm failed: ${json.error || res.status}`);
      return;
    }
    setMessage(
      `${json.created ? "Created" : "Idempotent"} commission ${json.commission?.amount_cents} ${json.commission?.currency} (${json.commission?.status})`
    );
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

  async function invitePartner(id: string) {
    setMessage(null);
    setLastInvite(null);
    const res = await fetch(`/api/admin/partners/${id}/invite`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({}),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(`Invite failed: ${json.error || res.status}`);
      return;
    }
    const claimHint = `/ua/partners/invite/${encodeURIComponent(json.token)}`;
    setLastInvite(claimHint);
    setMessage(`Invite created for ${json.email} (expires ${json.expires_at})`);
  }

  async function approveApp(id: string) {
    setMessage(null);
    setLastInvite(null);
    const res = await fetch(`/api/admin/partners/applications/${id}`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify({ action: "approve", create_invite: true }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(`Approve failed: ${json.error || res.status}`);
      return;
    }
    if (json.invite?.token) {
      setLastInvite(`/ua/partners/invite/${encodeURIComponent(json.invite.token)}`);
    }
    setMessage(`Approved → partner ${json.partner?.referral_code}`);
    await load();
  }

  async function rejectApp(id: string) {
    setMessage(null);
    const reason = window.prompt("Reject reason (internal)") || "";
    const res = await fetch(`/api/admin/partners/applications/${id}`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify({ action: "reject", reject_reason: reason }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(`Reject failed: ${json.error || res.status}`);
      return;
    }
    setMessage("Application rejected");
    await load();
  }

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Partners</h1>
        <p className="mt-1 text-sm text-gray-600">
          Phase 2: applications, invites, dashboard. Commissions still require admin-confirm — not
          specialist_plan.
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {lastInvite ? (
        <p className="break-all rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-mono text-xs text-amber-900">
          Claim URL (copy once): {typeof window !== "undefined" ? window.location.origin : ""}
          {lastInvite}
        </p>
      ) : null}

      <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Pending applications</h2>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Applicant</th>
              <th className="px-3 py-2">Channel</th>
              <th className="px-3 py-2">Platform</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={4}>
                  No pending applications.
                </td>
              </tr>
            ) : (
              applications.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-gray-500">{a.email}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div>{a.channel_name}</div>
                    <a
                      className="text-xs text-indigo-600 break-all"
                      href={a.channel_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {a.channel_url}
                    </a>
                  </td>
                  <td className="px-3 py-2">{a.platform || "—"}</td>
                  <td className="px-3 py-2 space-x-2">
                    <button
                      type="button"
                      className="text-xs font-semibold text-emerald-700"
                      onClick={() => void approveApp(a.id)}
                    >
                      Approve + invite
                    </button>
                    <button
                      type="button"
                      className="text-xs font-semibold text-red-600"
                      onClick={() => void rejectApp(a.id)}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Create partner</h2>
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
            placeholder="Commission cents"
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

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Confirm first payment</h2>
        <form onSubmit={confirmPayment} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder="Specialist ID"
            value={confirmForm.specialist_id}
            onChange={(e) => setConfirmForm((f) => ({ ...f, specialist_id: e.target.value }))}
            required
          />
          <input
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder="External payment reference"
            value={confirmForm.external_payment_reference}
            onChange={(e) =>
              setConfirmForm((f) => ({ ...f, external_payment_reference: e.target.value }))
            }
            required
          />
          <button
            type="submit"
            className="sm:col-span-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Confirm first payment (idempotent)
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
              <th className="px-3 py-2">Bound</th>
              <th className="px-3 py-2">Rate</th>
              <th className="px-3 py-2">Clicks</th>
              <th className="px-3 py-2">Regs</th>
              <th className="px-3 py-2">Approved €</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={9}>
                  Loading…
                </td>
              </tr>
            ) : partners.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={9}>
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
                  <td className="px-3 py-2 font-mono text-xs">/r/{p.referral_code}</td>
                  <td className="px-3 py-2">{p.status}</td>
                  <td className="px-3 py-2 text-xs">{p.user_id ? "yes" : "no"}</td>
                  <td className="px-3 py-2">
                    {(p.commission_amount_cents / 100).toFixed(2)} {p.currency}
                  </td>
                  <td className="px-3 py-2">{p.summary.clicks}</td>
                  <td className="px-3 py-2">{p.summary.registrations}</td>
                  <td className="px-3 py-2">
                    {(p.summary.total_approved_cents / 100).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 space-x-2 whitespace-nowrap">
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
                    {!p.user_id ? (
                      <button
                        type="button"
                        className="text-xs font-semibold text-emerald-700"
                        onClick={() => void invitePartner(p.id)}
                      >
                        Invite
                      </button>
                    ) : null}
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
