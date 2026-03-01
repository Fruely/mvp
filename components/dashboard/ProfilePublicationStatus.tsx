import Link from "next/link";
import { isProfilePublished, type PublicationService } from "@/lib/dashboard/isProfilePublished";

export default function ProfilePublicationStatus({
  services,
}: {
  services: PublicationService[];
}) {
  const published = isProfilePublished(services);

  if (published) {
    return (
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
        <div className="mb-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          Профиль опубликован
        </div>
        <p className="text-sm text-emerald-800">Вы участвуете в ротации категории.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
      <div className="mb-2 inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
        Профиль не опубликован
      </div>
      <p className="text-sm text-rose-800">
        Чтобы участвовать в выдаче:
        <br />• Добавьте хотя бы одну активную услугу
        <br />• Укажите цену
      </p>
      <Link
        href="/specialist/dashboard/services"
        className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700"
      >
        Перейти к услугам
      </Link>
    </section>
  );
}

