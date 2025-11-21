import de from "../locales/de.json";
import en from "../locales/en.json";
import ua from "../locales/ua.json";

const LOCALES = { de, en, ua };

export function t(key, lang = "de") {
  const dict = LOCALES[lang] || LOCALES["de"];
  return dict[key] || key;
}
