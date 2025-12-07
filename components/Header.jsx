import Link from "next/link";
import { useEffect, useState } from "react";

const LANGS = [
  { code: "de", label: "DE" },
  { code: "en", label: "EN" },
  { code: "ua", label: "UA" }
];

export default function Header({ onLangChange }) {
  const [lang, setLang] = useState("de");

  useEffect(() => {
    const saved = typeof window !== "undefined" && localStorage.getItem("freuly_lang");
    if (saved) setLang(saved);
  }, []);

  const changeLang = (code) => {
    setLang(code);
    if (typeof window !== "undefined") localStorage.setItem("freuly_lang", code);
    if (onLangChange) onLangChange(code);
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                F
              </div>
              <div className="leading-tight">
                <div className="text-2xl font-bold text-blue-600">Freuly</div>
                <div className="text-xs text-gray-600">Твой язык — твой специалист</div>
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <a className="text-gray-700 hover:text-blue-600 font-medium transition" href="#categories">Категории</a>
            <Link href="/about" className="text-gray-700 hover:text-blue-600 font-medium transition">О нас</Link>
            <Link href="/contacts" className="text-gray-700 hover:text-blue-600 font-medium transition">Контакты</Link>
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <div className="text-sm text-gray-600 mr-2">Ты специалист?</div>
              <Link href="/specialist" className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm hover:shadow-md transition">
                Присоединиться
              </Link>
            </div>

            <div className="flex items-center gap-2 border border-gray-200 rounded-full overflow-hidden bg-gray-50">
              {LANGS.map(l => (
                <button
                  key={l.code}
                  onClick={() => changeLang(l.code)}
                  className={`px-3 py-1 text-sm font-medium transition ${lang === l.code ? "bg-blue-600 text-white" : "text-gray-600 hover:text-blue-600"}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modern Hero Section with Visual Concept */}
      <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 border-t border-gray-100">
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
                <Link
                  href="/#categories"
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 shadow-lg hover:shadow-xl transition text-center"
                >
                  Найти специалиста
                </Link>
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
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-6xl shadow-lg">
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
      </div>
    </header>
  );
}
