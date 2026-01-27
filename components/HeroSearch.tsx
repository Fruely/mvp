"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type FilterOption = { id: string; name: string };

export default function HeroSearch({ lang }: { lang: string }) {
  const router = useRouter();

  const [language, setLanguage] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");

  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [languages, setLanguages] = useState<FilterOption[]>([]);
  const [postalCodes, setPostalCodes] = useState<FilterOption[]>([]);

  useEffect(() => {
    fetch("/api/filters")
      .then((r) => r.json())
      .then((data) => {
        if (data.categories) {
          setCategories(
            data.categories.map((c: { slug: string; title: string }) => ({
              id: c.slug,
              name: c.title,
            }))
          );
        }
        if (data.languages) {
          setLanguages(
            data.languages.map((l: string) => ({ id: l, name: l }))
          );
        }
        if (data.postal_codes) {
          setPostalCodes(
            data.postal_codes.map((p: string) => ({ id: p, name: p }))
          );
        }
      })
      .catch(() => {});
  }, []);

  function handleSearch() {
    const params = new URLSearchParams();
    if (language) params.set("language", language);
    if (category) params.set("category", category);
    if (city) params.set("city", city);
    router.push(`/${lang}/search?${params.toString()}`);
  }

  return (
    <section style={{ padding: "64px 0", textAlign: "center" }}>
      <h1 style={{ fontSize: "40px", marginBottom: "12px" }}>
        Найди специалиста на своём языке в Германии
      </h1>

      <p style={{ fontSize: "18px", opacity: 0.8, marginBottom: "32px" }}>
        Психологи, услуги, обучение и помощь — без языкового барьера
      </p>

      <button
        type="button"
        onClick={handleSearch}
        style={{
          padding: "14px 32px",
          fontSize: "16px",
          borderRadius: "8px",
          background: "#000",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          marginBottom: "32px",
        }}
      >
        Найди специалиста
      </button>

      <div
        style={{
          maxWidth: "820px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr auto",
          border: "1px solid #ddd",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "12px", borderRight: "1px solid #ddd" }}>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 0",
              fontSize: "14px",
              border: "none",
              background: "transparent",
              outline: "none",
            }}
          >
            <option value="">Язык</option>
            {languages.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ padding: "12px", borderRight: "1px solid #ddd" }}>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 0",
              fontSize: "14px",
              border: "none",
              background: "transparent",
              outline: "none",
            }}
          >
            <option value="">Категория</option>
            {categories.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ padding: "12px", borderRight: "1px solid #ddd" }}>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 0",
              fontSize: "14px",
              border: "none",
              background: "transparent",
              outline: "none",
            }}
          >
            <option value="">Город / индекс</option>
            {postalCodes.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ padding: "12px" }}>
          <button
            type="button"
            onClick={handleSearch}
            style={{
              padding: "8px 20px",
              fontSize: "14px",
              fontWeight: 600,
              borderRadius: "8px",
              background: "#000",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Поиск
          </button>
        </div>
      </div>
    </section>
  );
}
