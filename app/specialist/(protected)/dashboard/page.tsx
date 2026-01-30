export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import ProfileEditor from "./ProfileEditor";
import AccountBlock from "./AccountBlock";

export default async function SpecialistDashboardPage() {
  const { supabase, user, specialist } = await getCurrentUserAndSpecialist();

  const status = specialist.status;

  if (status !== "approved" && status !== "paused") {
    redirect("/ua");
  }

  const { data: profile } = await supabase
    .from("specialist_profiles")
    .select(
      "photo_url, video_url, gallery_urls, about_me, services, how_i_work, experience, city, radius_km, categories"
    )
    .eq("specialist_id", specialist.id)
    .maybeSingle();

  // Informational requests count (not sold leads, no guarantees)
  // This is purely informational data about incoming client requests
  const now = new Date();
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();

  const { count: monthlyRequestsCount } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("specialist_id", specialist.id)
    .gte("created_at", startOfMonth);

  const firstName = specialist.first_name?.trim() || "";

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Welcome block */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">
            Здравствуйте
            {firstName ? (
              <>
                , <span className="font-bold">{firstName}</span> 👋
              </>
            ) : (
              " 👋"
            )}
          </h1>
          <p className="mt-2 text-gray-700">
            Рады видеть вас на Froyle. Желаем вам хорошего и продуктивного
            рабочего дня.
          </p>
          <p className="mt-3 text-sm text-gray-500">
            Ваш профиль активен и участвует в ротации платформы.
          </p>
        </section>

        {/* Activity block */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Активность профиля
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Количество обращений / запросов за текущий месяц.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-3xl font-semibold text-gray-900">
                {monthlyRequestsCount ?? 0}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                обращения / запросы
              </p>
            </div>

            <div className="w-full sm:w-2/3">
              <div className="h-3 w-full rounded-full bg-gray-100">
                <div
                  className="h-3 rounded-full bg-emerald-500 transition-all"
                  style={{
                    width: `${
                      monthlyRequestsCount && monthlyRequestsCount > 0
                        ? Math.min(100, (monthlyRequestsCount / 10) * 100)
                        : 16
                    }%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Ознакомительный индикатор активности. Этот простой график
                носит информационный характер и не является обещанием результатов.
              </p>
            </div>
          </div>
        </section>

        {/* Profile editor block */}
        <section className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Профиль специалиста
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Расскажите о себе и своей работе — эти данные видят ваши
              потенциальные клиенты.
            </p>
          </div>

          <ProfileEditor
            initialProfile={{
              about_me: profile?.about_me ?? "",
              services: profile?.services ?? "",
              how_i_work: profile?.how_i_work ?? "",
              experience: profile?.experience ?? "",
              city: profile?.city ?? "",
              radius_km: profile?.radius_km ?? null,
              categories: (profile?.categories as string[] | null) ?? [],
            }}
          />
        </section>

        {/* Account block */}
        <section className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Аккаунт</h2>
            <p className="mt-1 text-sm text-gray-500">
              Обновите контактные данные и при необходимости поставьте профиль
              на паузу.
            </p>
          </div>

          <AccountBlock
            email={specialist.email || user.email || ""}
            initialPhone={specialist.phone || ""}
          />
        </section>

        {/* Footer / support */}
        <footer className="py-6 text-center text-sm text-gray-500">
          Есть вопросы? Напишите нам:{" "}
          <a
            href="mailto:support@froyle.de"
            className="font-medium text-emerald-600 hover:text-emerald-700"
          >
            support@froyle.de
          </a>
        </footer>
      </div>
    </div>
  );
}
