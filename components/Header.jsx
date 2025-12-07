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
    </header>
  );
}
