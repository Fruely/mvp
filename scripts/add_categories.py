import json

# Add missing category translations
translations = {
    "locales/ru.json": {"lawyers": "Юристы", "migration": "Миграция", "cleaning": "Уборка", "housemaster": "Домашний мастер", "coaching": "Коучинг", "beauty": "Красота", "transport": "Транспорт"},
    "locales/de.json": {"lawyers": "Anwälte", "migration": "Migration", "cleaning": "Reinigung", "housemaster": "Hausmeister", "coaching": "Coaching", "beauty": "Schönheit", "transport": "Transport"},
    "locales/ua.json": {"lawyers": "Юристи", "migration": "Міграція", "cleaning": "Прибирання", "housemaster": "Домашній майстер", "coaching": "Коучинг", "beauty": "Краса", "transport": "Транспорт"},
    "locales/en.json": {"lawyers": "Lawyers", "migration": "Migration", "cleaning": "Cleaning", "housemaster": "Housemaster", "coaching": "Coaching", "beauty": "Beauty", "transport": "Transport"},
}

for fname, cats in translations.items():
    with open(fname, "r") as f:
        data = json.load(f)
    
    if "categories" not in data:
        data["categories"] = {}
    
    if isinstance(data["categories"], dict):
        for slug, label in cats.items():
            if slug not in data["categories"]:
                data["categories"][slug] = label
    
    with open(fname, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

print("Category translations added to all locale files.")
