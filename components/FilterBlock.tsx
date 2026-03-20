import type { ChangeEvent } from "react";
import type { Dictionary } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export type FilterOption = {
  id: string;
  name: string;
};

interface Props {
  selectedCategory: string;
  selectedPostalCode: string;
  selectedLanguage: string;
  categories: FilterOption[];
  postalCodes: FilterOption[];
  languages: FilterOption[];
  onCategoryChange: (value: string) => void;
  onPostalCodeChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
  dict?: Dictionary;
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition";

function SelectField({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  placeholder: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <select className={inputClass} value={value} onChange={onChange}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function FilterBlock({
  selectedCategory,
  selectedPostalCode,
  selectedLanguage,
  categories,
  postalCodes,
  languages,
  onCategoryChange,
  onPostalCodeChange,
  onLanguageChange,
  dict,
}: Props) {
  const tSafe = (key: string, fallback: string) => dict ? t(dict, key) : fallback;
  const handleReset = () => {
    onCategoryChange("");
    onPostalCodeChange("");
    onLanguageChange("");
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <SelectField
          label={tSafe("filter.category", "Category")}
          value={selectedCategory}
          options={categories}
          placeholder={tSafe("filter.allCategories", "All categories")}
          onChange={(e) => onCategoryChange(e.target.value)}
        />

        <SelectField
          label={tSafe("filter.postalCode", "Postal code")}
          value={selectedPostalCode}
          options={postalCodes}
          placeholder={tSafe("filter.anyPostalCode", "Any")}
          onChange={(e) => onPostalCodeChange(e.target.value)}
        />

        <SelectField
          label={tSafe("filter.language", "Language")}
          value={selectedLanguage}
          options={languages}
          placeholder={tSafe("filter.anyLanguage", "Any language")}
          onChange={(e) => onLanguageChange(e.target.value)}
        />

        <div className="flex w-full gap-3 md:w-auto md:ml-auto">
          <button
            type="button"
            onClick={handleReset}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 md:w-auto"
          >
            {tSafe("filter.reset", "Reset")}
          </button>
        </div>
      </div>
    </div>
  );
}
