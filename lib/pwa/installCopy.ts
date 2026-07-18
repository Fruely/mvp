import type { Lang } from "@/lib/i18n";
import type { InstallAudience, InstallPlacement } from "@/lib/pwa/installLogic";

export type InstallSharedCopy = {
  dismiss: string;
  iosTitle: string;
  iosStepShare: string;
  iosStepHome: string;
  iosStepAdd: string;
  androidHint: string;
  unsupportedHint: string;
  openSearch: string;
  openCabinet: string;
  closeInstructions: string;
  ctaInstall: string;
  ctaHow: string;
  ctaAddPhone: string;
  ctaAddCabinet: string;
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
    iosStepShare: "Натисніть «Поділитися»",
    iosStepHome: "Оберіть «На екран Додому»",
    iosStepAdd: "Потім натисніть «Додати»",
    androidHint: "Натисніть кнопку нижче і підтвердіть встановлення в браузері.",
    unsupportedHint: "Відкрийте сайт у Safari (iPhone) або Chrome (Android), щоб додати Freuly.",
    openSearch: "Відкрити пошук",
    openCabinet: "Увійти спеціалісту",
    closeInstructions: "Закрити",
    ctaInstall: "Встановити Freuly",
    ctaHow: "Як додати на екран",
    ctaAddPhone: "Додати на телефон",
    ctaAddCabinet: "Додати кабінет на телефон",
  },
  ru: {
    dismiss: "Не сейчас",
    iosTitle: "Добавьте Freuly на главный экран",
    iosStepShare: "Нажмите «Поделиться»",
    iosStepHome: "Выберите «На экран Домой»",
    iosStepAdd: "Затем нажмите «Добавить»",
    androidHint: "Нажмите кнопку ниже и подтвердите установку в браузере.",
    unsupportedHint: "Откройте сайт в Safari (iPhone) или Chrome (Android), чтобы добавить Freuly.",
    openSearch: "Открыть поиск",
    openCabinet: "Войти специалисту",
    closeInstructions: "Закрыть",
    ctaInstall: "Установить Freuly",
    ctaHow: "Как добавить на экран",
    ctaAddPhone: "Добавить на телефон",
    ctaAddCabinet: "Добавить кабинет на телефон",
  },
  de: {
    dismiss: "Nicht jetzt",
    iosTitle: "Freuly zum Startbildschirm hinzufügen",
    iosStepShare: "Tippen Sie auf «Teilen»",
    iosStepHome: "Wählen Sie «Zum Home-Bildschirm»",
    iosStepAdd: "Tippen Sie danach auf «Hinzufügen»",
    androidHint: "Tippen Sie unten auf die Schaltfläche und bestätigen Sie die Installation im Browser.",
    unsupportedHint: "Öffnen Sie die Seite in Safari (iPhone) oder Chrome (Android), um Freuly hinzuzufügen.",
    openSearch: "Suche öffnen",
    openCabinet: "Als Spezialist anmelden",
    closeInstructions: "Schließen",
    ctaInstall: "Freuly installieren",
    ctaHow: "So zum Startbildschirm hinzufügen",
    ctaAddPhone: "Zum Telefon hinzufügen",
    ctaAddCabinet: "Dashboard zum Telefon hinzufügen",
  },
};

/** Marketing copy for /app/install hero (audience only). */
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
      title: "Усі спеціалісти поруч і онлайн — в одному додатку Freuly",
      body: "Шукайте швидше з головного екрана телефону — без зайвих вкладок.",
      cta: shared.ctaAddPhone,
    };
  }
  if (lang === "de") {
    return {
      title: "Alle Spezialisten in der Nähe und online — in einer Freuly-App",
      body: "Suchen Sie schneller direkt vom Startbildschirm — ohne extra Tabs.",
      cta: shared.ctaAddPhone,
    };
  }
  return {
    title: "Все специалисты рядом и онлайн — в одном приложении Freuly",
    body: "Ищите быстрее с главного экрана телефона — без лишних вкладок.",
    cta: shared.ctaAddPhone,
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
        title: "Freuly завжди під рукою",
        body: "Додайте Freuly на головний екран і швидше повертайтеся до пошуку спеціалістів.",
        cta: shared.ctaAddPhone,
      };
    }
    if (lang === "de") {
      return {
        title: "Freuly immer griffbereit",
        body: "Fügen Sie Freuly zum Startbildschirm hinzu und kehren Sie schneller zur Spezialistensuche zurück.",
        cta: shared.ctaAddPhone,
      };
    }
    return {
      title: "Freuly всегда под рукой",
      body: "Добавьте Freuly на главный экран и быстрее возвращайтесь к поиску специалистов.",
      cta: shared.ctaAddPhone,
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
      title: audience === "specialist" ? shared.ctaAddCabinet : shared.ctaAddPhone,
      body:
        lang === "ua"
          ? "Натисніть кнопку нижче та підтвердіть додавання в браузері або через «Поділитися»."
          : lang === "de"
            ? "Tippen Sie unten auf die Schaltfläche und bestätigen Sie das Hinzufügen im Browser oder über «Teilen»."
            : "Нажмите кнопку ниже и подтвердите добавление в браузере или через «Поделиться».",
      cta: hero.cta,
    };
  }

  // app_shell + button fallback
  if (audience === "specialist") {
    if (lang === "ua") {
      return {
        title: "Кабінет Freuly завжди під рукою",
        body: "Додайте кабінет на головний екран телефону.",
        cta: shared.ctaAddCabinet,
      };
    }
    if (lang === "de") {
      return {
        title: "Freuly-Dashboard immer griffbereit",
        body: "Fügen Sie das Dashboard zum Startbildschirm hinzu.",
        cta: shared.ctaAddCabinet,
      };
    }
    return {
      title: "Кабинет Freuly всегда под рукой",
      body: "Добавьте кабинет на главный экран телефона.",
      cta: shared.ctaAddCabinet,
    };
  }

  if (lang === "ua") {
    return {
      title: "Freuly завжди під рукою",
      body: "Додайте Freuly на головний екран і шукайте швидше.",
      cta: shared.ctaAddPhone,
    };
  }
  if (lang === "de") {
    return {
      title: "Freuly immer griffbereit",
      body: "Fügen Sie Freuly zum Startbildschirm hinzu und suchen Sie schneller.",
      cta: shared.ctaAddPhone,
    };
  }
  return {
    title: "Freuly всегда под рукой",
    body: "Добавьте Freuly на главный экран и ищите быстрее.",
    cta: shared.ctaAddPhone,
  };
}
