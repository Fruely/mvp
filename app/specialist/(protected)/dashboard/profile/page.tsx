export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import ProfileEditor from "../ProfileEditor";
import MediaBlock from "../MediaBlock";
import SetPasswordBlock from "../SetPasswordBlock";
import LogoutButton from "../LogoutButton";
import { specialistLangHomePath } from "@/lib/specialists/navigation";

type ProfileRow = {
  about_me: string | null;
  services: string | null;
  how_i_work: string | null;
  experience: string | null;
  city: string | null;
  radius_km: number | null;
  categories: string[] | null;
  photo_url: string | null;
  video_url: string | null;
  gallery_urls: string[] | null;
  certificate_urls: string[] | null;
};

export default async function SpecialistDashboardProfilePage() {
  const { supabase, specialist } = await getCurrentUserAndSpecialist();

  if (specialist.status === "blocked") {
    redirect(specialistLangHomePath());
  }

  const { data, error } = await supabase
    .from("specialist_profiles")
    .select(
      "about_me, services, how_i_work, experience, city, radius_km, categories, photo_url, video_url, gallery_urls, certificate_urls"
    )
    .eq("specialist_id", specialist.id)
    .maybeSingle();

  if (error) {
    console.error("[dashboard/profile] failed to load profile", error);
  }

  const profile = (data ?? {}) as Partial<ProfileRow>;
  const showSetPassword = !specialist.password_set_at;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Профиль специалиста</h1>
          <p className="mt-1 text-sm text-gray-500">
            Заполните информацию о себе, добавьте медиа и обновите вид карточки в каталоге.
          </p>
        </div>
        <div className="shrink-0">
          <LogoutButton />
        </div>
      </section>

      {showSetPassword ? <SetPasswordBlock /> : null}

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Основная информация</h2>
        <ProfileEditor
          initialProfile={{
            about_me: typeof profile.about_me === "string" ? profile.about_me : "",
            services: typeof profile.services === "string" ? profile.services : "",
            how_i_work: typeof profile.how_i_work === "string" ? profile.how_i_work : "",
            experience: typeof profile.experience === "string" ? profile.experience : "",
            city: typeof profile.city === "string" ? profile.city : "",
            radius_km:
              typeof profile.radius_km === "number" && Number.isFinite(profile.radius_km)
                ? profile.radius_km
                : null,
            categories: Array.isArray(profile.categories)
              ? profile.categories.filter((c): c is string => typeof c === "string")
              : [],
          }}
        />
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Медиа и сертификаты</h2>
        <MediaBlock
          initialPhotoUrl={typeof profile.photo_url === "string" ? profile.photo_url : ""}
          initialVideoUrl={typeof profile.video_url === "string" ? profile.video_url : ""}
          initialGalleryUrls={
            Array.isArray(profile.gallery_urls)
              ? profile.gallery_urls.filter((u): u is string => typeof u === "string")
              : []
          }
          initialCertificateUrls={
            Array.isArray(profile.certificate_urls)
              ? profile.certificate_urls.filter((u): u is string => typeof u === "string")
              : []
          }
        />
      </section>
    </div>
  );
}

