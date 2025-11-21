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
            <Link href="/">
              <a className="flex items-center gap-3">
                <img src="/assets/logo.png" alt="Freuly" className="h-10 w-auto" />
                <div className="leading-tight">
                  <div className="text-2xl font-bold text-primary">Freuly</div>
                  <div className="text-xs text-gray-500">Специалист на твоём языке</div>
                </div>
              </a>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <a className="text-gray-700 hover:text-primary" href="#categories">Категории</a>
            <Link href="/about"><a className="text-gray-700 hover:text-primary">О нас</a></Link>
            <Link href="/contacts"><a className="text-gray-700 hover:text-primary">Контакты</a></Link>
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <div className="text-sm text-gray-600 mr-2">{/* question text */}Bist du Fachkraft?</div>
              <Link href="/specialist">
                <a className="px-4 py-2 rounded-full bg-primary text-white text-sm font-semibold hover:shadow-lg transform hover:scale-105 transition">
                  Bei Freuly beitreten
                </a>
              </Link>
            </div>

            <div className="flex items-center gap-2 border rounded-full overflow-hidden">
              {LANGS.map(l => (
                <button
                  key={l.code}
                  onClick={() => changeLang(l.code)}
                  className={`px-3 py-1 text-sm ${lang === l.code ? "bg-primary text-white" : "text-primary bg-white"}`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {/* mobile menu button could be here */}
          </div>
        </div>
      </div>
    </header>
  );
}
