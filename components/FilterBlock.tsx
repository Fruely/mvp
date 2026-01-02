import type { ChangeEvent } from "react";

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
}: Props) {
  const handleReset = () => {
    onCategoryChange("");
    onPostalCodeChange("");
    onLanguageChange("");
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <SelectField
          label="Категория"
          value={selectedCategory}
          options={categories}
          placeholder="Все категории"
          onChange={(e) => onCategoryChange(e.target.value)}
        />

        <SelectField
          label="Почтовый индекс"
          value={selectedPostalCode}
          options={postalCodes}
          placeholder="Любой индекс"
          onChange={(e) => onPostalCodeChange(e.target.value)}
        />

        <SelectField
          label="Язык общения"
          value={selectedLanguage}
          options={languages}
          placeholder="Любой язык"
          onChange={(e) => onLanguageChange(e.target.value)}
        />

        <div className="flex w-full gap-3 md:w-auto md:ml-auto">
          <button
            type="button"
            onClick={handleReset}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 md:w-auto"
          >
            Сбросить
          </button>
        </div>
      </div>
    </div>
  );
}
