"use client";

type Props = {
  lang: string;
  dict: any;
};

export default function SpecialistApplicationForm({ lang, dict }: Props) {
  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-semibold mb-4">
        {dict?.application?.title ?? "Подать заявку как специалист"}
      </h1>

      <p className="text-gray-600">
        Это новая форма заявки специалиста. Скоро здесь будет полноценная форма.
      </p>
    </div>
  );
}
