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
    { title: "Психологи", icon: "🧠" },
    { title: "Массажисты", icon: "💆" },
    { title: "Репетиторы", icon: "📚" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header onLangChange={(c) => setLang(c)} />

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
