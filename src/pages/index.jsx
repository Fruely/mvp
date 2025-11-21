import Header from "../components/Header";
import Hero from "../components/Hero";
import CategoryCard from "../components/CategoryCard";
import { useState, useEffect } from "react";
import { t } from "../utils/i18n";

export default function Home() {
  const [lang, setLang] = useState("de");

  useEffect(() => {
    const saved = typeof window !== "undefined" && localStorage.getItem("freuly_lang");
    if (saved) setLang(saved);
  }, []);

  const categories = [
    { title: "Psychologen", subtitle: "Unterstützung & Beratung", img: "/assets/psychology.jpg" },
    { title: "Masseure", subtitle: "Entspannung & Gesundheit", img: "/assets/massage.jpg" },
    { title: "Nachhilfelehrer", subtitle: "Bildung & Entwicklung", img: "/assets/tutor.jpg" },
    { title: "Handwerker", subtitle: "Reparatur & Renovierung", img: "/assets/repair.jpg" },
    { title: "Logistik & Umzug", subtitle: "Transport & Hilfe", img: "/assets/moving.jpg" },
    { title: "Ärzte", subtitle: "Medizinische Beratung", img: "/assets/doctor.jpg" }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header onLangChange={(c) => setLang(c)} />

      <main className="flex-grow">
        <Hero
          title={t("hero.title", lang)}
          subtitle={t("hero.subtitle", lang)}
          cta={t("hero.cta", lang)}
        />

        <section id="categories" className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="text-center text-2xl font-semibold mb-8">{t("categories.title", lang)}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((c, i) => (
              <CategoryCard key={i} {...c} />
            ))}
          </div>

          <div className="flex justify-center mt-8">
            <button className="px-5 py-2 border rounded-full text-primary hover:shadow-md">
              {t("card.more", lang)}
            </button>
          </div>
        </section>
      </main>

      <footer className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-10 flex flex-col md:flex-row justify-between items-start gap-6">
          <div>
            <div className="text-2xl font-bold text-primary">Freuly</div>
            <div className="text-sm text-gray-600 mt-2 max-w-sm">Freuly — место, где люди находят профессионалов, говорящих на их языке.</div>
          </div>

          <div className="flex gap-10">
            <div>
              <h4 className="font-semibold mb-2">Компания</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li><a href="#" className="hover:text-primary">О нас</a></li>
                <li><a href="#" className="hover:text-primary">Поддержка</a></li>
                <li><a href="#" className="hover:text-primary">Для специалистов</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Контакты</h4>
              <p className="text-sm text-gray-600">info@freuly.example</p>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 py-4 border-t">
          © 2025 Freuly. Все права защищены.
        </div>
      </footer>
    </div>
  );
}
