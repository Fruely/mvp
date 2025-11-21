import { useEffect } from "react";

export default function Hero({ title, subtitle, cta, onCta }) {
  // simple smooth scroll handler if onCta not provided
  const handleClick = () => {
    if (onCta) return onCta();
    const el = document.getElementById("categories");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="relative">
      <div className="bg-gradient-to-b from-blue-600 to-blue-500 text-white">
        <div className="max-w-7xl mx-auto px-4 py-24 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">{title}</h1>
          <p className="max-w-2xl mx-auto text-md sm:text-lg text-blue-100 mb-8">{subtitle}</p>
          <div>
            <button onClick={handleClick} className="btn-primary inline-block px-6 py-3 text-lg">
              {cta}
            </button>
          </div>
          <div className="mt-8 animate-bounce text-white/80">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" className="mx-auto">
              <path d="M12 16l-6-6h12l-6 6z" fill="white"/>
            </svg>
          </div>
        </div>
      </div>

      {/* decorative svg/illustration area (optional) */}
      <div className="h-12 bg-white"></div>
    </section>
  );
}
