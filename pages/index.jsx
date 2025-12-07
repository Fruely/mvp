import { useState, useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const [lang, setLang] = useState("de");

  useEffect(() => {
    const saved = typeof window !== "undefined" && localStorage.getItem("freuly_lang");
    if (saved) setLang(saved);
  }, []);

  const scrollToCategories = () => {
    document.getElementById("categories")?.scrollIntoView({ behavior: "smooth" });
  };

  const placeholderCategories = [
    { title: "Психологи", icon: "🧠" },
    { title: "Массажисты", icon: "💆" },
    { title: "Репетиторы", icon: "📚" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Modern Sticky Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="text-2xl font-bold text-blue-600">
              FROYLE
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium transition">
                Главная
              </Link>
              <a
                href="#categories"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToCategories();
                }}
                className="text-gray-700 hover:text-blue-600 font-medium transition cursor-pointer"
              >
                Категории
              </a>
              <Link href="/specialist" className="text-gray-700 hover:text-blue-600 font-medium transition">
                Для специалистов
              </Link>
            </nav>

            {/* CTA Button */}
            <Link
              href="/specialist"
              className="px-6 py-2 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition shadow-sm hover:shadow-md"
            >
              Стать специалистом
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-20 md:py-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Найди специалиста, который говорит на твоём языке
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Психологи, массажисты, репетиторы и другие специалисты, говорящие на немецком, русском или украинском
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={scrollToCategories}
              className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-full hover:bg-blue-700 transition shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Найти специалиста
            </button>
            <Link
              href="/specialist"
              className="px-8 py-4 border-2 border-blue-600 text-blue-600 text-lg font-semibold rounded-full hover:bg-blue-50 transition"
            >
              Стать специалистом
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section id="categories" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Популярные категории
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Выберите категорию специалистов, которые помогут вам решить задачи на вашем родном языке
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {placeholderCategories.map((category, index) => (
              <div
                key={index}
                className="group bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl border border-gray-100"
              >
                <div className="w-20 h-20 mx-auto mb-4 bg-white rounded-full flex items-center justify-center text-4xl shadow-md group-hover:shadow-lg transition">
                  {category.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition">
                  {category.title}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-10 flex flex-col md:flex-row justify-between items-start gap-6">
          <div>
            <div className="text-2xl font-bold text-blue-600">FROYLE</div>
            <div className="text-sm text-gray-600 mt-2 max-w-sm">
              Freuly — место, где люди находят профессионалов, говорящих на их языке.
            </div>
          </div>

          <div className="flex gap-10">
            <div>
              <h4 className="font-semibold mb-2">Компания</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  <Link href="/about" className="hover:text-blue-600">
                    О нас
                  </Link>
                </li>
                <li>
                  <Link href="/support" className="hover:text-blue-600">
                    Поддержка
                  </Link>
                </li>
                <li>
                  <Link href="/specialist" className="hover:text-blue-600">
                    Для специалистов
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Контакты</h4>
              <p className="text-sm text-gray-600">info@freuly.example</p>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 py-4 border-t border-gray-200">
          © 2025 Freuly. Все права защищены.
        </div>
      </footer>
    </div>
  );
}
