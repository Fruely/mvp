"use client";

export default function ErrorPage({ error, reset }: any) {
  return (
    <div className="min-h-screen flex items-center justify-center text-center p-6">
      <div>
        <h1 className="text-2xl font-bold mb-4">Произошла ошибка</h1>
        <p className="text-gray-600 mb-6">{error?.message || "Неизвестная ошибка"}</p>

        <button
          className="px-6 py-2 bg-primary text-white rounded-full shadow"
          onClick={() => reset()}
        >
          Повторить попытку
        </button>
      </div>
    </div>
  );
}
