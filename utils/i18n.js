import de from "../src/locales/de.json";
import en from "../src/locales/en.json";
import ua from "../src/locales/ua.json";

const LOCALES = { de, en, ua };

export function t(key, lang = "de") {
  const dict = LOCALES[lang] || LOCALES["de"];
  return dict[key] || key;
}
