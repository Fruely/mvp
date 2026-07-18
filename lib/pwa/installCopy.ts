import type { Lang } from "@/lib/i18n";
import type { InstallAudience } from "@/lib/pwa/installLogic";

export type InstallCopy = {
  titleClient: string;
  bodyClient: string;
  titleSpecialist: string;
  bodySpecialist: string;
  ctaInstall: string;
  ctaHow: string;
  dismiss: string;
  iosTitle: string;
  iosStepShare: string;
  iosStepHome: string;
  iosStepAdd: string;
  unsupportedHint: string;
  openSearch: string;
  openCabinet: string;
  closeInstructions: string;
};

export const INSTALL_COPY: Record<Lang, InstallCopy> = {
  ua: {
    titleClient: "Усі спеціалісти поруч і онлайн — в одному додатку Freuly",
    bodyClient: "Додайте Freuly на головний екран і шукайте швидше.",
    titleSpecialist: "Профіль, заявки та кабінет Freuly завжди під рукою",
    bodySpecialist: "Додайте кабінет на головний екран телефону.",
    ctaInstall: "Встановити Freuly",
    ctaHow: "Як додати на екран",
    dismiss: "Не зараз",
    iosTitle: "Додайте Freuly на головний екран",
    iosStepShare: "Натисніть «Поділитися» в Safari",
    iosStepHome: "Оберіть «На екран Додому»",
    iosStepAdd: "Підтвердіть «Додати»",
    unsupportedHint: "Відкрийте сайт у Safari (iPhone) або Chrome (Android), щоб встановити Freuly.",
    openSearch: "Відкрити пошук",
    openCabinet: "Увійти спеціалісту",
    closeInstructions: "Закрити",
  },
  ru: {
    titleClient: "Все специалисты рядом и онлайн — в одном приложении Freuly",
    bodyClient: "Добавьте Freuly на главный экран и ищите быстрее.",
    titleSpecialist: "Профиль, заявки и кабинет Freuly всегда под рукой",
    bodySpecialist: "Добавьте кабинет на главный экран телефона.",
    ctaInstall: "Установить Freuly",
    ctaHow: "Как добавить на экран",
    dismiss: "Не сейчас",
    iosTitle: "Добавьте Freuly на главный экран",
    iosStepShare: "Нажмите «Поделиться» в Safari",
    iosStepHome: "Выберите «На экран Домой»",
    iosStepAdd: "Подтвердите «Добавить»",
    unsupportedHint: "Откройте сайт в Safari (iPhone) или Chrome (Android), чтобы установить Freuly.",
    openSearch: "Открыть поиск",
    openCabinet: "Войти специалисту",
    closeInstructions: "Закрыть",
  },
  de: {
    titleClient: "Alle Spezialisten in der Nähe und online — in einer Freuly-App",
    bodyClient: "Fügen Sie Freuly zum Startbildschirm hinzu und finden Sie schneller.",
    titleSpecialist: "Profil, Anfragen und Freuly-Dashboard immer griffbereit",
    bodySpecialist: "Fügen Sie das Dashboard zum Startbildschirm hinzu.",
    ctaInstall: "Freuly installieren",
    ctaHow: "So zum Startbildschirm hinzufügen",
    dismiss: "Nicht jetzt",
    iosTitle: "Freuly zum Startbildschirm hinzufügen",
    iosStepShare: "Tippen Sie in Safari auf «Teilen»",
    iosStepHome: "Wählen Sie «Zum Home-Bildschirm»",
    iosStepAdd: "Bestätigen Sie «Hinzufügen»",
    unsupportedHint: "Öffnen Sie die Seite in Safari (iPhone) oder Chrome (Android), um Freuly zu installieren.",
    openSearch: "Suche öffnen",
    openCabinet: "Als Spezialist anmelden",
    closeInstructions: "Schließen",
  },
};

export function installTitle(copy: InstallCopy, audience: InstallAudience): string {
  return audience === "specialist" ? copy.titleSpecialist : copy.titleClient;
}

export function installBody(copy: InstallCopy, audience: InstallAudience): string {
  return audience === "specialist" ? copy.bodySpecialist : copy.bodyClient;
}
