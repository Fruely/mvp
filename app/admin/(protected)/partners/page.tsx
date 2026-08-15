"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminPartnerPayoutQueue from "@/components/admin/AdminPartnerPayoutQueue";
import AdminReferralLinkActions from "@/components/admin/AdminReferralLinkActions";
import {
  buildAdminReferralUrl,
  formatPartnerStatusRu,
  partnerStatusHelpRu,
  suggestReferralCodeFromEmail,
} from "@/lib/admin/partnerAdminUi";

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

const STATUS_CONFIRM: Record<string, string> = {
  paused: "Приостановить партнёра? Новые переходы по ссылке перестанут учитываться.",
  disabled: "Отключить партнёра? Ссылка перестанет работать для новых переходов.",
  active: "Активировать партнёра? Реферальная ссылка снова будет работать.",
};

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
  const [referralCodeTouched, setReferralCodeTouched] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showCommissionHelp, setShowCommissionHelp] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/partners", { headers: adminHeaders(), cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Не удалось загрузить список партнёров");
        setPartners([]);
        return;
      }
      setPartners(json.partners ?? []);
    } catch {
      setError("Не удалось загрузить список партнёров");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (referralCodeTouched || !form.email.includes("@")) return;
    setForm((f) => ({ ...f, referral_code: suggestReferralCodeFromEmail(form.email) }));
  }, [form.email, referralCodeTouched]);

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
      setMessage(`Не удалось создать: ${json.error || res.status}`);
      return;
    }
    const url = buildAdminReferralUrl(json.partner?.referral_code ?? "");
    setMessage(
      url
        ? `Партнёр создан. Реферальная ссылка: ${url}`
        : `Партнёр создан: ${json.partner?.referral_code}`
    );
    setForm({ name: "", email: "", referral_code: "", commission_amount_cents: 2900 });
    setReferralCodeTouched(false);
    await load();
  }

  async function setStatus(id: string, status: string) {
    const confirmText = STATUS_CONFIRM[status];
    if (confirmText && !window.confirm(confirmText)) return;

    setMessage(null);
    const res = await fetch(`/api/admin/partners/${id}`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify({ status }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(`Не удалось изменить статус: ${json.error || res.status}`);
      return;
    }
    await load();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Партнёры</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            Управление партнёрской программой: создание партнёров, реферальные ссылки, статистика и
            выплаты.
          </p>
        </div>
        <Link
          href="/admin/help"
          className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100"
        >
          Как работать с партнёрской программой?
        </Link>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <section id="payouts">
        <AdminPartnerPayoutQueue onMessage={setMessage} />
      </section>

      <section id="create" className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-base font-semibold text-gray-900">Создание партнёра</h2>
        <p className="mt-1 text-sm text-gray-600">
          Заполните данные и нажмите «Создать активного партнёра». После создания скопируйте полную
          реферальную ссылку из таблицы ниже.
        </p>
        <form onSubmit={createPartner} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-gray-800">Имя партнёра</span>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-gray-800">Email</span>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-gray-800">Реферальный код</span>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm"
              value={form.referral_code}
              onChange={(e) => {
                setReferralCodeTouched(true);
                setForm((f) => ({ ...f, referral_code: e.target.value }));
              }}
              required
            />
            <span className="mt-1 block text-xs text-gray-500">
              Уникальный короткий код партнёра. Используется для создания его реферальной ссылки.
              Код подставляется автоматически из email — можно изменить до создания.
            </span>
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-gray-800">Справочная ставка (€, для архива)</span>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              type="number"
              min={1}
              step={1}
              value={form.commission_amount_cents}
              onChange={(e) =>
                setForm((f) => ({ ...f, commission_amount_cents: Number(e.target.value) }))
              }
              required
            />
            <button
              type="button"
              className="mt-1 text-xs text-indigo-600 hover:underline"
              onClick={() => setShowCommissionHelp((v) => !v)}
            >
              Как рассчитывается вознаграждение?
            </button>
            {showCommissionHelp ? (
              <p className="mt-2 rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600">
                Фактическое вознаграждение рассчитывается автоматически при первой успешной оплате
                специалиста по правилам программы. Поле «справочная ставка» хранится только для
                внутренней справки и не заменяет расчёт системы.
              </p>
            ) : null}
          </label>
          <button
            type="submit"
            className="sm:col-span-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Создать активного партнёра
          </button>
        </form>
      </section>

      <section id="partners" className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <div className="border-b px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">Список партнёров и статистика</h2>
          <p className="mt-1 text-xs text-gray-500">
            «Переходы» — клики по реферальной ссылке. «Регистрации» — специалисты, привязанные к
            партнёру. «Начислено» — одобренные комиссии в EUR.
          </p>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Партнёр</th>
              <th className="px-3 py-2">Реферальная ссылка</th>
              <th className="px-3 py-2">Статус</th>
              <th className="px-3 py-2" title="Зафиксированные переходы по ссылке">
                Переходы
              </th>
              <th className="px-3 py-2" title="Специалисты, привязанные к партнёру">
                Регистрации
              </th>
              <th className="px-3 py-2" title="Сумма одобренных комиссий">
                Начислено
              </th>
              <th className="px-3 py-2">Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={7}>
                  Загрузка…
                </td>
              </tr>
            ) : partners.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={7}>
                  Партнёров пока нет.
                </td>
              </tr>
            ) : (
              partners.map((p) => {
                const statusHelp = partnerStatusHelpRu(p.status);
                return (
                  <tr key={p.id} className="border-b last:border-0 align-top">
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-500">{p.email}</div>
                    </td>
                    <td className="px-3 py-2 min-w-[220px]">
                      <AdminReferralLinkActions referralCode={p.referral_code} compact />
                    </td>
                    <td className="px-3 py-2">
                      <div>{formatPartnerStatusRu(p.status)}</div>
                      {statusHelp ? (
                        <div className="mt-1 max-w-[180px] text-xs text-gray-500">{statusHelp}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{p.summary.clicks}</td>
                    <td className="px-3 py-2">{p.summary.registrations}</td>
                    <td className="px-3 py-2">
                      {(p.summary.total_approved_cents / 100).toFixed(2)} €
                    </td>
                    <td className="px-3 py-2 space-y-1 whitespace-nowrap">
                      <button
                        type="button"
                        className="block text-xs font-semibold text-indigo-600"
                        onClick={() => void setStatus(p.id, "active")}
                      >
                        Активировать
                      </button>
                      <button
                        type="button"
                        className="block text-xs font-semibold text-amber-700"
                        onClick={() => void setStatus(p.id, "paused")}
                      >
                        Приостановить
                      </button>
                      <button
                        type="button"
                        className="block text-xs font-semibold text-red-600"
                        onClick={() => void setStatus(p.id, "disabled")}
                      >
                        Отключить
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      <section id="statuses" className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
        <h2 className="font-semibold text-gray-900">Статусы партнёров</h2>
        <ul className="mt-2 space-y-2">
          <li>
            <strong>Активен</strong> — реферальная ссылка работает, новые переходы учитываются.
          </li>
          <li>
            <strong>Приостановлен</strong> — новые переходы по ссылке не принимаются; ранее выданные
            cookie могут сохраняться по правилам системы.
          </li>
          <li>
            <strong>Отключён</strong> — партнёр не участвует в программе, ссылка не работает для
            новых переходов.
          </li>
        </ul>
      </section>
    </div>
  );
}
