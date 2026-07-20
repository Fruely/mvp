import assert from "node:assert/strict";
import test from "node:test";
import { INSTALL_SHARED_COPY, landingHeroMessage, resolveInstallMessage } from "./installCopy.ts";

test("landing hero audience copy exists in UA/RU/DE", () => {
  for (const lang of ["ua", "ru", "de"]) {
    const client = landingHeroMessage(lang, "client");
    const specialist = landingHeroMessage(lang, "specialist");
    assert.ok(client.title.length > 8);
    assert.ok(specialist.title.length > 8);
    assert.notEqual(client.title, specialist.title);
  }
});

test("product install copy RU/UA/DE on home", () => {
  const homeRu = resolveInstallMessage("ru", "client", "home_mobile");
  assert.equal(homeRu.title, "Установите мобильное приложение Freuly");
  assert.equal(homeRu.body, "Будьте всегда на связи");
  assert.equal(homeRu.cta, "Установить приложение");

  const homeUa = resolveInstallMessage("ua", "client", "home_mobile");
  assert.equal(homeUa.title, "Встановіть мобільний застосунок Freuly");
  assert.equal(homeUa.body, "Будьте завжди на зв’язку");
  assert.equal(homeUa.cta, "Встановити застосунок");

  const homeDe = resolveInstallMessage("de", "client", "home_mobile");
  assert.equal(homeDe.title, "Installieren Sie die Freuly-App");
  assert.equal(homeDe.body, "Bleiben Sie jederzeit verbunden");
  assert.equal(homeDe.cta, "App installieren");
});

test("placement messages match promotion intents", () => {
  const dashRu = resolveInstallMessage("ru", "specialist", "dashboard");
  assert.equal(dashRu.title, "Кабинет Freuly всегда под рукой");
  assert.equal(dashRu.cta, "Установить приложение");

  const leadRu = resolveInstallMessage("ru", "client", "lead_success");
  assert.match(leadRu.title, /Заявка отправлена/);

  const profileUa = resolveInstallMessage("ua", "client", "specialist_profile");
  assert.match(profileUa.title, /Freuly/);
  assert.ok(profileUa.body.length > 0);
});

test("forbidden auto-install and old technical phrasing is absent", () => {
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
    /как добавить на экран/i,
    /як додати на екран/i,
    /добавить на телефон/i,
    /додати на телефон/i,
    /zum telefon hinzufügen/i,
    /so zum startbildschirm hinzufügen/i,
  ];
  for (const lang of ["ua", "ru", "de"]) {
    for (const placement of placements) {
      const msg = resolveInstallMessage(lang, "client", placement);
      const blob = `${msg.title} ${msg.body} ${msg.cta}`;
      for (const re of banned) {
        assert.equal(re.test(blob), false, `${lang}/${placement} matched ${re}`);
      }
    }
    const shared = INSTALL_SHARED_COPY[lang];
    const sharedBlob = `${shared.ctaHow} ${shared.ctaAddPhone} ${shared.ctaInstall}`;
    for (const re of banned) {
      assert.equal(re.test(sharedBlob), false, `shared ${lang} matched ${re}`);
    }
  }
});

test("install guide copy covers Safari and Chrome iOS steps", async () => {
  for (const lang of ["ua", "ru", "de"]) {
    const c = INSTALL_SHARED_COPY[lang];
    assert.match(c.safariStepShare, /Share|Поділитися|Поделиться|Teilen/i);
    assert.ok(c.chromeStepMore.length > 3);
    assert.ok(c.chromeStepHome.length > 3);
    assert.ok(c.androidFallback.length > 10);
  }
});
