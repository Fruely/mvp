import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center text-center p-6">
      <div>
        <h1 className="text-3xl font-bold mb-4">Специалист не найден</h1>
        <p className="text-gray-600 mb-6">
          Возможно, такого специалиста ещё нет
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-primary text-white rounded-full shadow hover:shadow-lg transition"
        >
          На главную
        </Link>
      </div>
    </div>
  );
}
