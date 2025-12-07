import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "../components/Header";

export default function Home() {
  const [lang, setLang] = useState("de");

  useEffect(() => {
    const saved = typeof window !== "undefined" && localStorage.getItem("freuly_lang");
    if (saved) setLang(saved);
  }, []);

  const placeholderCategories = [
    { id: "psychologists", title: "Психологи", icon: "🧠" },
    { id: "masseurs", title: "Массажисты", icon: "💆" },
    { id: "tutors", title: "Репетиторы", icon: "📚" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header onLangChange={(c) => setLang(c)} />

      {/* Hero Section with Visual Concept */}
      <section className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Left Side - Text */}
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                Найди специалиста, который говорит на <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">твоём языке</span>
              </h1>
              <p className="text-lg text-gray-700 mb-6">
                Психологи, массажисты, репетиторы и другие профессионалы, готовые помочь вам на немецком, русском или украинском языке
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="#categories"
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 shadow-lg hover:shadow-xl transition text-center cursor-pointer"
                >
                  Найти специалиста
                </a>
                <Link
                  href="/specialist"
                  className="px-6 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-full hover:bg-blue-50 transition text-center"
                >
                  Стать специалистом
                </Link>
              </div>
            </div>

            {/* Right Side - Visual Representation */}
            <div className="hidden md:flex items-center justify-center">
              <div className="relative w-80 h-80">
                {/* Center Circle - Globe */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-6xl shadow-lg">
                    🌍
                  </div>
                </div>

                {/* Floating Elements - Languages */}
                <div className="absolute top-0 left-8 animate-bounce" style={{ animationDelay: "0s" }}>
                  <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center text-3xl border-2 border-blue-200">
                    🇩🇪
                  </div>
                  <p className="text-center text-sm font-semibold text-gray-700 mt-2">Deutsch</p>
                </div>

                <div className="absolute top-32 right-4 animate-bounce" style={{ animationDelay: "0.2s" }}>
                  <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center text-3xl border-2 border-purple-200">
                    🇷🇺
                  </div>
                  <p className="text-center text-sm font-semibold text-gray-700 mt-2">Русский</p>
                </div>

                <div className="absolute bottom-8 left-12 animate-bounce" style={{ animationDelay: "0.4s" }}>
                  <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center text-3xl border-2 border-pink-200">
                    🇺🇦
                  </div>
                  <p className="text-center text-sm font-semibold text-gray-700 mt-2">Українська</p>
                </div>

                {/* Specialist Icons */}
                <div className="absolute bottom-0 right-8 animate-pulse">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-3xl shadow-lg">
                    👨‍⚕️
                  </div>
                </div>
              </div>
            </div>
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
            {placeholderCategories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.id}`}
              >
                <div className="group bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl border border-gray-100">
                  <div className="w-20 h-20 mx-auto mb-4 bg-white rounded-full flex items-center justify-center text-4xl shadow-md group-hover:shadow-lg transition">
                    {category.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition">
                    {category.title}
                  </h3>
                </div>
              </Link>
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
