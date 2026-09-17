import assert from "node:assert/strict";
import test from "node:test";
import { fillMissingLocalizedCopies } from "./localizedPublicCopy.ts";

test("fillMissingLocalizedCopies translates only empty locales and keeps the source copy", async () => {
  const copy = await fillMissingLocalizedCopies({
    sourceLocale: "ua",
    title: "Потрібен фотограф",
    summary: "Портфоліо в Köln",
    existing: { ua: { title: "Потрібен фотограф", summary: "Портфоліо в Köln" } },
    translate: async (_source, target) => {
      if (target === "ru") return { title: "Нужен фотограф", summary: "Портфолио в Köln" };
      if (target === "de") return { title: "Fotograf gesucht", summary: "Portfolio in Köln" };
      return null;
    },
  });

  assert.equal(copy.ua?.title, "Потрібен фотограф");
  assert.equal(copy.ru?.title, "Нужен фотограф");
  assert.equal(copy.de?.title, "Fotograf gesucht");
});

test("existing edited translations are not overwritten", async () => {
  const copy = await fillMissingLocalizedCopies({
    sourceLocale: "ru",
    title: "Нужен риэлтор",
    summary: "Квартира в Dortmund",
    existing: {
      ru: { title: "Нужен риэлтор", summary: "Квартира в Dortmund" },
      de: { title: "Manuell geprüft", summary: "Wohnung in Dortmund" },
    },
    translate: async () => ({ title: "should not appear", summary: "should not appear" }),
  });

  assert.equal(copy.de?.title, "Manuell geprüft");
});
