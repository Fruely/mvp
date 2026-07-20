import type { Lang } from "@/lib/i18n";
import type { InstallAudience, InstallPlacement } from "@/lib/pwa/installLogic";

export type InstallSharedCopy = {
  dismiss: string;
  iosTitle: string;
  /** Legacy short steps; prefer safari/chrome fields on the install guide. */
  iosStepShare: string;
  iosStepHome: string;
  iosStepAdd: string;
  safariHeading: string;
  safariStepShare: string;
  safariStepHome: string;
  safariStepAdd: string;
  chromeHeading: string;
  chromeStepShare: string;
  chromeStepMore: string;
  chromeStepHome: string;
  chromeStepAdd: string;
  androidHeading: string;
  androidHint: string;
  androidFallback: string;
  unsupportedHint: string;
  openSearch: string;
  openCabinet: string;
  closeInstructions: string;
  ctaInstall: string;
  ctaHow: string;
  ctaAddPhone: string;
  ctaAddCabinet: string;
  guideTitle: string;
};

export type InstallMessage = {
  title: string;
  body: string;
  cta: string;
};

export const INSTALL_SHARED_COPY: Record<Lang, InstallSharedCopy> = {
  ua: {
    dismiss: "Не зараз",
    iosTitle: "Додайте Freuly на головний екран",
    iosStepShare: "У Safari натисніть «Поділитися» внизу екрана",
    iosStepHome: "Оберіть «На екран «Додому»»",
    iosStepAdd: "Натисніть «Додати»",
    safariHeading: "iPhone · Safari",
    safariStepShare: "Натисніть іконку «Поділитися» внизу екрана",
    safariStepHome: "Оберіть «На екран «Додому»»",
    safariStepAdd: "Натисніть «Додати»",
    chromeHeading: "iPhone · Chrome",
    chromeStepShare: "Натисніть іконку «Поділитися» справа вгорі в адресному рядку",
    chromeStepMore: "Оберіть «Показати більше»",
    chromeStepHome: "Оберіть «Додати на екран «Додому»»",
    chromeStepAdd: "Натисніть «Додати»",
    androidHeading: "Android · Chrome",
    androidHint: "Натисніть «Встановити застосунок» і підтвердіть встановлення в системному вікні.",
    androidFallback:
      "Якщо вікно встановлення не з’явилось: меню Chrome (⋮) → «Встановити додаток» або «Додати на головний екран».",
    unsupportedHint: "Відкрийте сайт у Safari (iPhone) або Chrome (Android), щоб додати Freuly.",
    openSearch: "Відкрити пошук",
    openCabinet: "Увійти спеціалісту",
    closeInstructions: "Закрити",
    ctaInstall: "Встановити застосунок",
    ctaHow: "Встановити застосунок",
    ctaAddPhone: "Встановити застосунок",
    ctaAddCabinet: "Встановити застосунок",
    guideTitle: "Інструкція зі встановлення",
  },
  ru: {
    dismiss: "Не сейчас",
    iosTitle: "Добавьте Freuly на главный экран",
    iosStepShare: "В Safari нажмите «Поделиться» внизу экрана",
    iosStepHome: "Выберите «На экран «Домой»»",
    iosStepAdd: "Нажмите «Добавить»",
    safariHeading: "iPhone · Safari",
    safariStepShare: "Нажмите иконку «Поделиться» внизу экрана",
    safariStepHome: "Выберите «На экран «Домой»»",
    safariStepAdd: "Нажмите «Добавить»",
    chromeHeading: "iPhone · Chrome",
    chromeStepShare: "Нажмите иконку «Поделиться» справа вверху в адресной строке",
    chromeStepMore: "Выберите «Показать больше»",
    chromeStepHome: "Выберите «Добавить на экран «Домой»»",
    chromeStepAdd: "Нажмите «Добавить»",
    androidHeading: "Android · Chrome",
    androidHint: "Нажмите «Установить приложение» и подтвердите установку в системном окне.",
    androidFallback:
      "Если окно установки не появилось: меню Chrome (⋮) → «Установить приложение» или «Добавить на главный экран».",
    unsupportedHint: "Откройте сайт в Safari (iPhone) или Chrome (Android), чтобы добавить Freuly.",
    openSearch: "Открыть поиск",
    openCabinet: "Войти специалисту",
    closeInstructions: "Закрыть",
    ctaInstall: "Установить приложение",
    ctaHow: "Установить приложение",
    ctaAddPhone: "Установить приложение",
    ctaAddCabinet: "Установить приложение",
    guideTitle: "Инструкция по установке",
  },
  de: {
    dismiss: "Nicht jetzt",
    iosTitle: "Freuly zum Startbildschirm hinzufügen",
    iosStepShare: "Tippen Sie in Safari unten auf «Teilen»",
    iosStepHome: "Wählen Sie «Zum Home-Bildschirm»",
    iosStepAdd: "Tippen Sie auf «Hinzufügen»",
    safariHeading: "iPhone · Safari",
    safariStepShare: "Tippen Sie unten auf das Symbol «Teilen»",
    safariStepHome: "Wählen Sie «Zum Home-Bildschirm»",
    safariStepAdd: "Tippen Sie auf «Hinzufügen»",
    chromeHeading: "iPhone · Chrome",
    chromeStepShare: "Tippen Sie rechts oben in der Adresszeile auf «Teilen»",
    chromeStepMore: "Wählen Sie «Mehr anzeigen»",
    chromeStepHome: "Wählen Sie «Zum Home-Bildschirm»",
    chromeStepAdd: "Tippen Sie auf «Hinzufügen»",
    androidHeading: "Android · Chrome",
    androidHint:
      "Tippen Sie auf «App installieren» und bestätigen Sie die Installation im Systemdialog.",
    androidFallback:
      "Wenn kein Dialog erscheint: Chrome-Menü (⋮) → «App installieren» oder «Zum Startbildschirm hinzufügen».",
    unsupportedHint:
      "Öffnen Sie die Seite in Safari (iPhone) oder Chrome (Android), um Freuly hinzuzufügen.",
    openSearch: "Suche öffnen",
    openCabinet: "Als Spezialist anmelden",
    closeInstructions: "Schließen",
    ctaInstall: "App installieren",
    ctaHow: "App installieren",
    ctaAddPhone: "App installieren",
    ctaAddCabinet: "App installieren",
    guideTitle: "Installationsanleitung",
  },
};

/** Marketing copy for install hero (audience only). */
export function landingHeroMessage(lang: Lang, audience: InstallAudience): InstallMessage {
  const shared = INSTALL_SHARED_COPY[lang];
  if (audience === "specialist") {
    if (lang === "ua") {
      return {
        title: "Профіль, заявки та кабінет Freuly завжди під рукою",
        body: "Додайте кабінет на головний екран — і відкривайте заявки без зайвих кроків.",
        cta: shared.ctaAddCabinet,
      };
    }
    if (lang === "de") {
      return {
        title: "Profil, Anfragen und Freuly-Dashboard immer griffbereit",
        body: "Fügen Sie das Dashboard zum Startbildschirm hinzu — und öffnen Sie Anfragen ohne Umwege.",
        cta: shared.ctaAddCabinet,
      };
    }
    return {
      title: "Профиль, заявки и кабинет Freuly всегда под рукой",
      body: "Добавьте кабинет на главный экран — и открывайте заявки без лишних шагов.",
      cta: shared.ctaAddCabinet,
    };
  }

  if (lang === "ua") {
    return {
      title: "Встановіть мобільний застосунок Freuly",
      body: "Будьте завжди на зв’язку",
      cta: shared.ctaInstall,
    };
  }
  if (lang === "de") {
    return {
      title: "Installieren Sie die Freuly-App",
      body: "Bleiben Sie jederzeit verbunden",
      cta: shared.ctaInstall,
    };
  }
  return {
    title: "Установите мобильное приложение Freuly",
    body: "Будьте всегда на связи",
    cta: shared.ctaInstall,
  };
}

/** Placement-specific CTA messages for InstallFreuly. */
export function resolveInstallMessage(
  lang: Lang,
  audience: InstallAudience,
  placement: InstallPlacement
): InstallMessage {
  const shared = INSTALL_SHARED_COPY[lang];

  if (placement === "home_mobile") {
    if (lang === "ua") {
      return {
        title: "Встановіть мобільний застосунок Freuly",
        body: "Будьте завжди на зв’язку",
        cta: shared.ctaInstall,
      };
    }
    if (lang === "de") {
      return {
        title: "Installieren Sie die Freuly-App",
        body: "Bleiben Sie jederzeit verbunden",
        cta: shared.ctaInstall,
      };
    }
    return {
      title: "Установите мобильное приложение Freuly",
      body: "Будьте всегда на связи",
      cta: shared.ctaInstall,
    };
  }

  if (placement === "specialist_profile") {
    if (lang === "ua") {
      return {
        title: "Збережіть Freuly на телефоні",
        body: "Щоб швидко повертатися до пошуку спеціалістів.",
        cta: shared.ctaAddPhone,
      };
    }
    if (lang === "de") {
      return {
        title: "Freuly auf dem Telefon speichern",
        body: "So kehren Sie schneller zur Spezialistensuche zurück.",
        cta: shared.ctaAddPhone,
      };
    }
    return {
      title: "Сохраните Freuly на телефоне",
      body: "Чтобы быстро возвращаться к поиску специалистов.",
      cta: shared.ctaAddPhone,
    };
  }

  if (placement === "dashboard") {
    if (lang === "ua") {
      return {
        title: "Кабінет Freuly завжди під рукою",
        body: "Додайте додаток на головний екран, щоб швидше відкривати заявки та редагувати профіль.",
        cta: shared.ctaAddCabinet,
      };
    }
    if (lang === "de") {
      return {
        title: "Freuly-Dashboard immer griffbereit",
        body: "Fügen Sie die App zum Startbildschirm hinzu, um Anfragen schneller zu öffnen und Ihr Profil zu bearbeiten.",
        cta: shared.ctaAddCabinet,
      };
    }
    return {
      title: "Кабинет Freuly всегда под рукой",
      body: "Добавьте приложение на главный экран, чтобы быстрее открывать заявки и редактировать профиль.",
      cta: shared.ctaAddCabinet,
    };
  }

  if (placement === "lead_success") {
    if (lang === "ua") {
      return {
        title: "Заявку надіслано",
        body: "Додайте Freuly на головний екран, щоб швидко повернутися до пошуку.",
        cta: shared.ctaAddPhone,
      };
    }
    if (lang === "de") {
      return {
        title: "Anfrage gesendet",
        body: "Fügen Sie Freuly zum Startbildschirm hinzu, um schnell zur Suche zurückzukehren.",
        cta: shared.ctaAddPhone,
      };
    }
    return {
      title: "Заявка отправлена",
      body: "Добавьте Freuly на главный экран, чтобы быстро вернуться к поиску.",
      cta: shared.ctaAddPhone,
    };
  }

  if (placement === "install_page") {
    const hero = landingHeroMessage(lang, audience);
    return {
      title: hero.title,
      body: hero.body,
      cta: hero.cta,
    };
  }

  // app_shell + button fallback — client product copy; specialist keeps cabinet framing
  if (audience === "specialist") {
    if (lang === "ua") {
      return {
        title: "Кабінет Freuly завжди під рукою",
        body: "Додайте кабінет на головний екран телефону.",
        cta: shared.ctaInstall,
      };
    }
    if (lang === "de") {
      return {
        title: "Freuly-Dashboard immer griffbereit",
        body: "Fügen Sie das Dashboard zum Startbildschirm hinzu.",
        cta: shared.ctaInstall,
      };
    }
    return {
      title: "Кабинет Freuly всегда под рукой",
      body: "Добавьте кабинет на главный экран телефона.",
      cta: shared.ctaInstall,
    };
  }

  if (lang === "ua") {
    return {
      title: "Встановіть мобільний застосунок Freuly",
      body: "Будьте завжди на зв’язку",
      cta: shared.ctaInstall,
    };
  }
  if (lang === "de") {
    return {
      title: "Installieren Sie die Freuly-App",
      body: "Bleiben Sie jederzeit verbunden",
      cta: shared.ctaInstall,
    };
  }
  return {
    title: "Установите мобильное приложение Freuly",
    body: "Будьте всегда на связи",
    cta: shared.ctaInstall,
  };
}
