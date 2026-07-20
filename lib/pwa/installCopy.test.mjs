import assert from "node:assert/strict";
import test from "node:test";
import { landingHeroMessage, resolveInstallMessage } from "./installCopy.ts";

test("landing hero audience copy exists in UA/RU/DE", () => {
  for (const lang of ["ua", "ru", "de"]) {
    const client = landingHeroMessage(lang, "client");
    const specialist = landingHeroMessage(lang, "specialist");
    assert.ok(client.title.length > 8);
    assert.ok(specialist.title.length > 8);
    assert.notEqual(client.title, specialist.title);
  }
});

test("placement messages match promotion intents", () => {
  const homeRu = resolveInstallMessage("ru", "client", "home_mobile");
  assert.equal(homeRu.title, "Freuly всегда под рукой");
  assert.match(homeRu.body, /главный экран/);
  assert.equal(homeRu.cta, "Добавить на телефон");

  const dashRu = resolveInstallMessage("ru", "specialist", "dashboard");
  assert.equal(dashRu.title, "Кабинет Freuly всегда под рукой");
  assert.equal(dashRu.cta, "Добавить кабинет на телефон");

  const leadRu = resolveInstallMessage("ru", "client", "lead_success");
  assert.match(leadRu.title, /Заявка отправлена/);
  assert.match(leadRu.body, /главный экран/);

  const profileUa = resolveInstallMessage("ua", "client", "specialist_profile");
  assert.match(profileUa.title, /Freuly/);
  assert.ok(profileUa.body.length > 0);

  const homeDe = resolveInstallMessage("de", "client", "home_mobile");
  assert.match(homeDe.title, /Freuly/);
  assert.equal(homeDe.cta, "Zum Telefon hinzufügen");
});

test("forbidden auto-install phrasing is absent", () => {
  const placements = [
    "home_mobile",
    "specialist_profile",
    "dashboard",
    "lead_success",
    "install_page",
    "app_shell",
  ];
  const banned = [
    /скачать автоматически/i,
    /установится одним/i,
    /app store/i,
    /google play/i,
    /как поставить/i,
    /поставить на экран/i,
    /як поставити/i,
    /поставити на екран/i,
  ];
  for (const lang of ["ua", "ru", "de"]) {
    for (const placement of placements) {
      const msg = resolveInstallMessage(lang, "client", placement);
      const blob = `${msg.title} ${msg.body} ${msg.cta}`;
      for (const re of banned) {
        assert.equal(re.test(blob), false, `${lang}/${placement} matched ${re}`);
      }
    }
  }
});

test("install guide copy covers Safari and Chrome iOS steps", async () => {
  const { INSTALL_SHARED_COPY } = await import("./installCopy.ts");
  for (const lang of ["ua", "ru", "de"]) {
    const c = INSTALL_SHARED_COPY[lang];
    assert.match(c.safariStepShare, /Share|Поділитися|Поделиться|Teilen/i);
    assert.ok(c.chromeStepMore.length > 3);
    assert.ok(c.chromeStepHome.length > 3);
    assert.ok(c.androidFallback.length > 10);
  }
});
