import type { Lang } from "@/lib/i18n";

export type CurrentPricingCompareRow = {
  label: string;
  professional: string;
  growth: string;
};

const ROWS: Record<Lang, CurrentPricingCompareRow[]> = {
  ru: [
    { label: "Канал клиентских заявок", professional: "Да", growth: "Да" },
    { label: "Публичный профиль", professional: "Да", growth: "Да" },
    { label: "Услуги и цены", professional: "Да", growth: "Да" },
    { label: "Фотографии в галерее", professional: "До 5", growth: "До 15" },
    { label: "Языки, формат работы и география", professional: "Да", growth: "Да" },
    { label: "Категории и поиск Freuly", professional: "Да", growth: "Да" },
    { label: "Уведомления о подходящих заявках", professional: "Да", growth: "Да" },
    { label: "Самостоятельное редактирование", professional: "Да", growth: "Да" },
    { label: "Расширенная Pro Page", professional: "—", growth: "Да" },
    { label: "Дополнительные смысловые блоки", professional: "—", growth: "Да" },
    { label: "Расширенная визуальная подача", professional: "—", growth: "Да" },
    { label: "Заполнение профиля нашей командой", professional: "+30 €", growth: "+30 €" },
    { label: "Профессиональная упаковка продукта", professional: "+149 €", growth: "+149 €" },
  ],
  ua: [
    { label: "Канал клієнтських запитів", professional: "Так", growth: "Так" },
    { label: "Публічний профіль", professional: "Так", growth: "Так" },
    { label: "Послуги та ціни", professional: "Так", growth: "Так" },
    { label: "Фотографії в галереї", professional: "До 5", growth: "До 15" },
    { label: "Мови, формат роботи та географія", professional: "Так", growth: "Так" },
    { label: "Категорії та пошук Freuly", professional: "Так", growth: "Так" },
    { label: "Сповіщення про відповідні запити", professional: "Так", growth: "Так" },
    { label: "Самостійне редагування", professional: "Так", growth: "Так" },
    { label: "Розширена Pro Page", professional: "—", growth: "Так" },
    { label: "Додаткові змістові блоки", professional: "—", growth: "Так" },
    { label: "Розширена візуальна подача", professional: "—", growth: "Так" },
    { label: "Заповнення профілю нашою командою", professional: "+30 €", growth: "+30 €" },
    { label: "Професійне оформлення продукту", professional: "+149 €", growth: "+149 €" },
  ],
  de: [
    { label: "Kundenanfrage-Kanal", professional: "Ja", growth: "Ja" },
    { label: "Öffentliches Profil", professional: "Ja", growth: "Ja" },
    { label: "Leistungen und Preise", professional: "Ja", growth: "Ja" },
    { label: "Galeriebilder", professional: "Bis 5", growth: "Bis 15" },
    { label: "Sprachen, Arbeitsformat und Geografie", professional: "Ja", growth: "Ja" },
    { label: "Kategorien und Freuly-Suche", professional: "Ja", growth: "Ja" },
    { label: "Benachrichtigungen zu passenden Anfragen", professional: "Ja", growth: "Ja" },
    { label: "Eigenständige Bearbeitung", professional: "Ja", growth: "Ja" },
    { label: "Erweiterte Pro Page", professional: "—", growth: "Ja" },
    { label: "Zusätzliche Inhaltsblöcke", professional: "—", growth: "Ja" },
    { label: "Erweiterte visuelle Präsentation", professional: "—", growth: "Ja" },
    { label: "Profilbefüllung durch unser Team", professional: "+30 €", growth: "+30 €" },
    { label: "Professionelle Produktaufbereitung", professional: "+149 €", growth: "+149 €" },
  ],
};

export function getCurrentPricingCompareRows(lang: Lang): CurrentPricingCompareRow[] {
  return ROWS[lang] ?? ROWS.ua;
}
