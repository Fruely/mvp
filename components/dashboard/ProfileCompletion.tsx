type ProfileCompletionData = {
  photo_url?: string | null;
  about_me?: string | null;
  services?: string | null;
  categories?: string[] | null;
  city?: string | null;
  radius_km?: number | null;
  video_url?: string | null;
  gallery_urls?: string[] | null;
  certificate_urls?: string[] | null;
};

export default function ProfileCompletion({ profile }: { profile: ProfileCompletionData | null }) {
  const checks = [
    {
      label: "Фото профиля",
      done: Boolean(profile?.photo_url && profile.photo_url.trim().length > 0),
    },
    {
      label: "Описание о себе",
      done: Boolean(profile?.about_me && profile.about_me.trim().length > 0),
    },
    {
      label: "Услуги / категории",
      done:
        Boolean(profile?.services && profile.services.trim().length > 0) ||
        Boolean(profile?.categories && profile.categories.length > 0),
    },
    {
      label: "Город / радиус",
      done:
        Boolean(profile?.city && profile.city.trim().length > 0) ||
        typeof profile?.radius_km === "number",
    },
    {
      label: "Медиа",
      done:
        Boolean(profile?.video_url && profile.video_url.trim().length > 0) ||
        Boolean(profile?.gallery_urls && profile.gallery_urls.length > 0) ||
        Boolean(profile?.certificate_urls && profile.certificate_urls.length > 0),
    },
  ];

  const completed = checks.filter((item) => item.done).length;
  const percent = Math.round((completed / checks.length) * 100);
  const recommendations = checks.filter((item) => !item.done).map((item) => item.label);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Заполненность профиля</h2>
      <p className="mt-1 text-sm text-gray-500">Улучшайте карточку, чтобы получать больше откликов.</p>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">{percent}%</span>
          <span className="text-xs text-gray-500">
            {completed}/{checks.length}
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-gray-100">
          <div
            className="h-2.5 rounded-full bg-blue-600 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {recommendations.length > 0 ? (
        <ul className="mt-4 space-y-1 text-sm text-gray-600">
          {recommendations.map((item) => (
            <li key={item}>• Добавьте: {item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm font-medium text-emerald-700">Профиль заполнен отлично.</p>
      )}
    </section>
  );
}

