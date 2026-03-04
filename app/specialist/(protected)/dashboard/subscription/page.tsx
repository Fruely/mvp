import { redirect } from "next/navigation";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import { isDashboardAllowedStatus } from "@/lib/specialists/status";

function getStatusClass(status: string): string {
  if (status === "early_access") return "bg-emerald-50 text-emerald-700";
  if (status === "active") return "bg-blue-50 text-blue-700";
  if (status === "grace") return "bg-amber-50 text-amber-700";
  if (status === "expired") return "bg-rose-50 text-rose-700";
  return "bg-gray-100 text-gray-700";
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ru-RU");
}

export default async function SpecialistDashboardSubscriptionPage() {
  const { specialist, supabase } = await getCurrentUserAndSpecialist();

  if (!isDashboardAllowedStatus(specialist.status)) {
    redirect("/specialist/claim/invalid?reason=status");
  }

  const specialistRecord = specialist as unknown as Record<string, unknown>;
  const { data: planRow } = await supabase
    .from("specialist_plan")
    .select("plan_code, plan_status, expires_at")
    .eq("specialist_id", specialist.id)
    .maybeSingle();

  const subscriptionStatusRaw =
    typeof planRow?.plan_status === "string" ? planRow.plan_status : specialistRecord.subscription_status;
  const planNameRaw =
    typeof planRow?.plan_code === "string" ? planRow.plan_code : specialistRecord.plan_name;
  const subscriptionUntilRaw =
    typeof planRow?.expires_at === "string" ? planRow.expires_at : specialistRecord.subscription_until;
  const graceUntilRaw = specialistRecord.grace_until;

  const status =
    typeof subscriptionStatusRaw === "string" && subscriptionStatusRaw.trim()
      ? subscriptionStatusRaw.trim()
      : "—";
  const planName =
    typeof planNameRaw === "string" && planNameRaw.trim() ? planNameRaw.trim() : "—";
  const subscriptionUntil =
    typeof subscriptionUntilRaw === "string" && subscriptionUntilRaw.trim() ? subscriptionUntilRaw : null;
  const graceUntil =
    typeof graceUntilRaw === "string" && graceUntilRaw.trim() ? graceUntilRaw : null;

  const ctaLabel =
    status === "expired"
      ? "Активировать тариф"
      : status === "grace"
        ? "Продлить сейчас"
        : "Управление подпиской";

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold text-gray-900">Подписка</h1>
          <p className="mt-1 text-sm text-gray-500">
            Статус доступа к контактам заявок и настройкам кабинета.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:grid-cols-2">
          <div className="rounded-lg bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Статус</p>
            <div className="mt-2">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(status)}`}>
                {status}
              </span>
            </div>
          </div>
          <div className="rounded-lg bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Тариф</p>
            <p className="mt-2 text-sm font-semibold text-gray-900">{planName}</p>
          </div>
          <div className="rounded-lg bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Действует до</p>
            <p className="mt-2 text-sm text-gray-800">{formatDate(subscriptionUntil)}</p>
          </div>
          <div className="rounded-lg bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Grace до</p>
            <p className="mt-2 text-sm text-gray-800">{formatDate(graceUntil)}</p>
          </div>
        </div>

        <a
          href="mailto:ihfo@freuly.de?subject=Freuly%20Subscription"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {ctaLabel}
        </a>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">FAQ</h2>
        <div className="mt-3 space-y-3 text-sm text-gray-700">
          <p>
            <span className="font-medium text-gray-900">Почему контакты могут быть скрыты?</span>
            <br />
            При статусе <code className="rounded bg-gray-100 px-1 py-0.5">expired</code> email и телефон в заявках
            скрываются до продления доступа.
          </p>
          <p>
            Лиды при этом остаются видимыми, включая дату, сообщение и статус работы по заявке.
          </p>
        </div>
      </section>
    </div>
  );
}

